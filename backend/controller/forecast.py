
from pathlib import Path

import pandas as pd
from fastapi import HTTPException

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

START = pd.Timestamp("2026-01-02T00:00:00Z")
END = pd.Timestamp("2026-02-02T00:00:00Z")


def forecast(delivery_day: str, decision_cutoff: str):
    forecasts_file = DATA_DIR / "forecasts.csv"
    actuals_file = DATA_DIR / "actuals.csv"

    try:
        # Validate delivery day.
        delivery_start = pd.Timestamp(
            f"{delivery_day}T00:00:00Z"
        )
        delivery_end = delivery_start + pd.Timedelta(days=1)

        if not START <= delivery_start < END:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Delivery day must be between "
                    "2026-01-02 and 2026-02-01."
                ),
            )

        # January 2026 is GMT in the UK, equivalent to UTC.
        cutoff = pd.Timestamp(decision_cutoff)

        if cutoff.tzinfo is not None:
            cutoff = cutoff.tz_convert("UTC")
        else:
            cutoff = cutoff.tz_localize("UTC")

        # Day-ahead decision must be made on the preceding day.
        previous_day = delivery_start - pd.Timedelta(days=1)

        if not (
            previous_day <= cutoff < delivery_start
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Decision cutoff must fall on the day "
                    "before the selected delivery day."
                ),
            )

        if not forecasts_file.exists() or not actuals_file.exists():
            raise HTTPException(
                status_code=404,
                detail="Actual or forecast CSV file not found.",
            )

        forecasts = pd.read_csv(forecasts_file)
        actuals = pd.read_csv(actuals_file)

        required_forecast = {
            "startTime",
            "publishTime",
            "generation",
        }
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

        # Parse and validate forecast data.
        forecasts["startTime"] = pd.to_datetime(
            forecasts["startTime"], utc=True, errors="coerce"
        )
        forecasts["publishTime"] = pd.to_datetime(
            forecasts["publishTime"], utc=True, errors="coerce"
        )
        forecasts["generation"] = pd.to_numeric(
            forecasts["generation"], errors="coerce"
        )

        forecasts = forecasts.dropna(
            subset=["startTime", "publishTime", "generation"]
        )

        # First select the requested delivery day's forecasts.
        forecasts = forecasts[
            (forecasts["startTime"] >= delivery_start)
            & (forecasts["startTime"] < delivery_end)
        ].copy()

        # Exclude forecasts published after the decision cutoff.
        forecasts = forecasts[
            forecasts["publishTime"] <= cutoff
        ].copy()

        # Select the latest eligible forecast for each delivery hour.
        forecasts = (
            forecasts.sort_values(["startTime", "publishTime"])
            .drop_duplicates(subset=["startTime"], keep="last")
            .copy()
        )

        # Parse actual generation data.
        actuals["startTime"] = pd.to_datetime(
            actuals["startTime"], utc=True, errors="coerce"
        )
        actuals["generation"] = pd.to_numeric(
            actuals["generation"], errors="coerce"
        )

        actuals = actuals.dropna(
            subset=["startTime", "generation"]
        )

        actuals = actuals[
            (actuals["startTime"] >= delivery_start)
            & (actuals["startTime"] < delivery_end)
        ].copy()

        # Aggregate half-hourly actuals into hourly averages
        # to match the hourly forecasts available in the CSV.
        actuals["startTime"] = actuals["startTime"].dt.floor("h")

        hourly_actuals = (
            actuals.groupby("startTime", as_index=False)["generation"]
            .mean()
            .rename(columns={"generation": "actual"})
        )

        # Attach actuals only after selecting the eligible forecast.
        forecasts = forecasts.merge(
            hourly_actuals,
            on="startTime",
            how="left",
        )

        forecasts = forecasts.sort_values("startTime")

        # Convert timestamps to ISO strings for JSON serialization.
        forecasts["startTime"] = forecasts["startTime"].dt.strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )
        forecasts["publishTime"] = forecasts["publishTime"].dt.strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )

        # Replace missing actual values with JSON null.
        forecasts = forecasts.astype(object).where(
            pd.notna(forecasts), None
        )

        return {
            "count": len(forecasts),
            "delivery_day": delivery_day,
            "decision_cutoff_uk": cutoff.strftime(
                "%Y-%m-%dT%H:%M:%SZ"
            ),
            "data": forecasts.to_dict(orient="records"),
        }

    except HTTPException:
        raise
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid delivery day or decision cutoff. "
                "Use YYYY-MM-DD and an ISO datetime."
            ),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to load forecast and actual data: {str(exc)}",
        )
