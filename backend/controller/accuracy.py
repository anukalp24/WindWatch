
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import HTTPException, Query

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

ACTUALS_FILE = DATA_DIR / "actuals.csv"
FORECASTS_FILE = DATA_DIR / "forecasts.csv"

DECISION_START = pd.Timestamp("2026-01-01T00:00:00Z")
DECISION_END = pd.Timestamp("2026-02-01T00:00:00Z")
DELIVERY_START = pd.Timestamp("2026-01-02T00:00:00Z")
DELIVERY_END = pd.Timestamp("2026-02-02T00:00:00Z")


def accuracy(
    cutoff_time: str = Query(
        "10:00",
        description="Daily purchasing decision cutoff in UK time, HH:MM. January UK time is UTC.",
    )
):
    try:
        if not ACTUALS_FILE.exists() or not FORECASTS_FILE.exists():
            raise HTTPException(
                status_code=404,
                detail="Actual or forecast CSV file not found.",
            )

        try:
            hour, minute = map(int, cutoff_time.split(":"))
            if not (0 <= hour <= 23 and 0 <= minute <= 59):
                raise ValueError
        except (ValueError, AttributeError):
            raise HTTPException(
                status_code=400,
                detail="Invalid cutoff_time. Use HH:MM, for example 10:00.",
            )

        actuals = pd.read_csv(ACTUALS_FILE)
        forecasts = pd.read_csv(FORECASTS_FILE)

        if not {"startTime", "generation"}.issubset(actuals.columns):
            raise HTTPException(
                status_code=500,
                detail="Actuals CSV is missing required columns.",
            )

        if not {"startTime", "publishTime", "generation"}.issubset(
            forecasts.columns
        ):
            raise HTTPException(
                status_code=500,
                detail="Forecasts CSV is missing required columns.",
            )

        for df in (actuals, forecasts):
            df["startTime"] = pd.to_datetime(
                df["startTime"], utc=True, errors="coerce"
            )
            df["generation"] = pd.to_numeric(
                df["generation"], errors="coerce"
            )

        forecasts["publishTime"] = pd.to_datetime(
            forecasts["publishTime"], utc=True, errors="coerce"
        )

        actuals = actuals.dropna(subset=["startTime", "generation"])
        forecasts = forecasts.dropna(
            subset=["startTime", "publishTime", "generation"]
        )

        # Aggregate two half-hour actuals into one hourly average.
        actuals = actuals[
            (actuals["startTime"] >= DELIVERY_START)
            & (actuals["startTime"] < DELIVERY_END)
        ].copy()

        actuals["startTime"] = actuals["startTime"].dt.floor("h")

        actuals = (
            actuals.groupby("startTime", as_index=False)["generation"]
            .mean()
            .rename(columns={"generation": "actual"})
        )

        forecasts = forecasts[
            (forecasts["startTime"] >= DELIVERY_START)
            & (forecasts["startTime"] < DELIVERY_END)
        ].copy()

        forecasts = forecasts.sort_values("publishTime")

        matched_days = []
        missing_days = []

        # Each January decision evaluates the following delivery day.
        for day in pd.date_range(
            DECISION_START, DECISION_END, inclusive="left", freq="D"
        ):
            cutoff = day + pd.Timedelta(
                hours=hour, minutes=minute
            )

            delivery_day = day + pd.Timedelta(days=1)
            delivery_end = delivery_day + pd.Timedelta(days=1)

            day_forecasts = forecasts[
                (forecasts["publishTime"] <= cutoff)
                & (forecasts["startTime"] >= delivery_day)
                & (forecasts["startTime"] < delivery_end)
            ].copy()

            if day_forecasts.empty:
                missing_days.append(day.strftime("%Y-%m-%d"))
                continue

            latest = (
                day_forecasts.sort_values("publishTime")
                .drop_duplicates(subset=["startTime"], keep="last")
            )

            day_actuals = actuals[
                (actuals["startTime"] >= delivery_day)
                & (actuals["startTime"] < delivery_end)
            ]

            day_matched = latest.merge(
                day_actuals,
                on="startTime",
                how="inner",
            )

            if day_matched.empty:
                missing_days.append(day.strftime("%Y-%m-%d"))
                continue

            day_matched["decisionDate"] = day.strftime("%Y-%m-%d")
            day_matched["deliveryDate"] = delivery_day.strftime("%Y-%m-%d")
            matched_days.append(day_matched)

        if not matched_days:
            raise HTTPException(
                status_code=404,
                detail="No matching forecast and actual intervals found.",
            )

        matched = pd.concat(matched_days, ignore_index=True)
        matched = matched.sort_values(["startTime", "decisionDate"])

        errors = matched["generation"] - matched["actual"]

        mae = errors.abs().mean()
        rmse = np.sqrt((errors ** 2).mean())
        bias = errors.mean()

        return {
            "cutoff_time_uk": cutoff_time,
            "decision_days_evaluated": int(matched["decisionDate"].nunique()),
            "missing_decision_days": missing_days,
            "intervals_evaluated": int(len(matched)),
            "metrics": {
                "mae": round(float(mae), 2),
                "rmse": round(float(rmse), 2),
                "bias": round(float(bias), 2),
            },
            "data": [
                {
                    "decisionDate": row.decisionDate,
                    "deliveryDate": row.deliveryDate,
                    "startTime": row.startTime.strftime(
                        "%Y-%m-%dT%H:%M:%SZ"
                    ),
                    "forecast": round(float(row.generation), 2),
                    "actual": round(float(row.actual), 2),
                    "error": round(float(row.generation - row.actual), 2),
                }
                for row in matched.itertuples(index=False)
            ],
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to calculate forecast accuracy: {str(exc)}",
        )
