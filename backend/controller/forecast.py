
from pathlib import Path

import pandas as pd
from fastapi import HTTPException

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

START = pd.Timestamp("2026-01-02T00:00:00Z")
END = pd.Timestamp("2026-02-02T00:00:00Z")


def forecast():
    forecasts_file = DATA_DIR / "forecasts.csv"
    actuals_file = DATA_DIR / "actuals.csv"

    try:
        if not forecasts_file.exists() or not actuals_file.exists():
            raise HTTPException(
                status_code=404,
                detail="Actual or forecast CSV file not found.",
            )

        forecasts = pd.read_csv(forecasts_file)
        actuals = pd.read_csv(actuals_file)

        required_forecast = {"startTime", "publishTime", "generation"}
        required_actual = {"startTime", "generation"}

        if not required_forecast.issubset(forecasts.columns):
            raise HTTPException(
                status_code=500,
                detail="Forecasts CSV is missing required columns.",
            )

        if not required_actual.issubset(actuals.columns):
            raise HTTPException(
                status_code=500,
                detail="Actuals CSV is missing required columns.",
            )

        # Parse timestamps and generation values.
        forecasts["startTime"] = pd.to_datetime(
            forecasts["startTime"], utc=True, errors="coerce"
        )
        forecasts["publishTime"] = pd.to_datetime(
            forecasts["publishTime"], utc=True, errors="coerce"
        )
        forecasts["generation"] = pd.to_numeric(
            forecasts["generation"], errors="coerce"
        )

        actuals["startTime"] = pd.to_datetime(
            actuals["startTime"], utc=True, errors="coerce"
        )
        actuals["generation"] = pd.to_numeric(
            actuals["generation"], errors="coerce"
        )

        forecasts = forecasts.dropna(
            subset=["startTime", "publishTime", "generation"]
        )
        actuals = actuals.dropna(
            subset=["startTime", "generation"]
        )

        # Keep delivery intervals relevant to January decisions.
        forecasts = forecasts[
            (forecasts["startTime"] >= START)
            & (forecasts["startTime"] < END)
        ].copy()

        actuals = actuals[
            (actuals["startTime"] >= START)
            & (actuals["startTime"] < END)
        ].copy()

        # Aggregate half-hourly actuals into hourly averages,
        # matching the hourly forecast intervals.
        actuals["startTime"] = actuals["startTime"].dt.floor("h")

        hourly_actuals = (
            actuals.groupby("startTime", as_index=False)["generation"]
            .mean()
            .rename(columns={"generation": "actual"})
        )

        # Attach the same hourly actual to every forecast vintage
        # for that delivery hour.
        forecasts = forecasts.merge(
            hourly_actuals,
            on="startTime",
            how="left",
        )

        forecasts = forecasts.sort_values(
            ["startTime", "publishTime"]
        )

        # Format timestamps for the frontend.
        forecasts["startTime"] = forecasts["startTime"].dt.strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )
        forecasts["publishTime"] = forecasts["publishTime"].dt.strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )

        forecasts["actual"] = forecasts["actual"].where(
            forecasts["actual"].notna(), None
        )

        return {
            "count": len(forecasts),
            "data": forecasts.to_dict(orient="records"),
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to load forecast and actual data: {str(exc)}",
        )
