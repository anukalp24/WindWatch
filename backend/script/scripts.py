
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
import requests

BASE = "https://data.elexon.co.uk/bmrs/api/v1/datasets"
OUT = Path(__file__).resolve().parent.parent / "data"

# Purchasing decisions: 1 Jan - 31 Jan 2026.
# Assumption: decisions are for next-day delivery.
# Relevant delivery dates: 2 Jan - 1 Feb 2026.
START = datetime(2025, 12, 28, tzinfo=timezone.utc)
END = datetime(2026, 2, 3, tzinfo=timezone.utc)

DELIVERY_START = pd.Timestamp("2026-01-02T00:00:00Z")
DELIVERY_END = pd.Timestamp("2026-02-02T00:00:00Z")  # exclusive


def fetch(dataset, params):
    url = f"{BASE}/{dataset}/stream"
    response = requests.get(url, params=params, timeout=60)
    response.raise_for_status()
    return response.json()


def pull(dataset, extra_params, day_chunks=1):
    rows = []
    cur = START

    while cur < END:
        nxt = min(cur + timedelta(days=day_chunks), END)

        params = {
            "publishDateTimeFrom": cur.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "publishDateTimeTo": nxt.strftime("%Y-%m-%dT%H:%M:%SZ"),
            **extra_params,
        }

        data = fetch(dataset, params)
        print(f"{dataset} | {cur.date()} | {len(data)} rows")
        rows.extend(data)
        cur = nxt

    return pd.DataFrame(rows)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)

    # Fetch actual wind generation
    actuals = pull("FUELHH", {"fuelType": "WIND"})

    actuals["startTime"] = pd.to_datetime(actuals["startTime"], utc=True)

    actuals = actuals[
        (actuals["startTime"] >= DELIVERY_START)
        & (actuals["startTime"] < DELIVERY_END)
    ]

    actuals = actuals[["startTime", "generation"]].drop_duplicates(
        subset=["startTime"]
    )

    actuals.to_csv(OUT / "actuals.csv", index=False)

    # Fetch wind forecasts, preserving publication timestamps
    forecasts = pull("WINDFOR", {})

    forecasts["startTime"] = pd.to_datetime(forecasts["startTime"], utc=True)
    forecasts["publishTime"] = pd.to_datetime(
        forecasts["publishTime"], utc=True
    )

    forecasts = forecasts[
        (forecasts["startTime"] >= DELIVERY_START)
        & (forecasts["startTime"] < DELIVERY_END)
    ]

    forecasts = forecasts[
        ["startTime", "publishTime", "generation"]
    ].drop_duplicates()

    forecasts.to_csv(OUT / "forecasts.csv", index=False)

    print("\nDone. Filtered files saved in:", OUT)
    print("Actual intervals:", len(actuals))
    print("Forecast records:", len(forecasts))

    if not actuals.empty:
        print(
            "Actual delivery range:",
            actuals["startTime"].min(),
            "to",
            actuals["startTime"].max(),
        )

    if not forecasts.empty:
        print(
            "Forecast delivery range:",
            forecasts["startTime"].min(),
            "to",
            forecasts["startTime"].max(),
        )
