from pathlib import Path

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.accuracy import accuracyRouter
from routes.forecast import Forecastrouter

DATA_DIR = Path(__file__).resolve().parent / "data"

app = FastAPI(title="Wind Forecast API")

# React (localhost:5173) ko backend call karne dene ke liye
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://wind-watch.vercel.app" , "http://localhost:5173" ],
    allow_methods=["*"],
    allow_headers=["*"],
)

actuals = None
forecasts = None

app.include_router(Forecastrouter)
app.include_router(accuracyRouter)