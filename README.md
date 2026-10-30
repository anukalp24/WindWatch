# WindWatch

**A Wind Generation Forecast Evaluation Pilot Using Historical Elexon Data**

## 1. Project Overview

WindWatch evaluates wind generation forecasts against actual generation using historical Elexon data for January 2026.

It replays 31 daily purchasing decisions and helps users understand how reliable wind forecasts were at different decision cutoffs.

The application provides two main views:

- **Forecast:** Displays the latest eligible wind forecast for each delivery hour at a selected decision cutoff, alongside actual generation.
- **Accuracy:** Evaluates historical forecasts using MAE, RMSE and bias.

## 2. Features

### Forecast
- Select a delivery day and decision cutoff.
- Filter forecasts using publication timestamps (`publishTime`).
- Select the latest eligible forecast for each delivery hour.
- Display hourly forecast and actual wind generation.
- Show average, peak and lowest forecast values.

### Accuracy
- Evaluate 31 historical decision days.
- Calculate MAE, RMSE and bias.
- Display forecast and actual generation using a line chart.
- Visualise daily forecast errors using a bar chart.
- Report missing decision days.

## 3. Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js, Vite |
| Routing | React Router |
| Charts | Recharts |
| Backend | Python, FastAPI |
| Data processing | Pandas |
| Data source | Elexon API |
| Data storage | CSV files |
| Frontend deployment | Vercel |
| Backend deployment | Render |

## 4. Architecture

WindWatch follows a stateless architecture without a database. Historical data is fetched from Elexon using a Python script and stored in CSV files. The FastAPI backend processes these files and exposes API endpoints consumed by the React frontend.

```text
                  Elexon API
                      |
                      v
                Python Fetch Script
                      |
                      v
                   CSV Files
                      |
                      v
                FastAPI + Pandas
                      |
                      v
                   REST API
                      |
                      v
               React + Vite Frontend
```

## 5. Backend API Endpoints

The FastAPI backend exposes two main endpoints:

| Endpoint | Purpose |
|---|---|
| `/forecast` | Retrieves forecast and actual generation data for a selected delivery day and decision cutoff. |
| `/accuracy` | Evaluates historical forecast accuracy and returns MAE, RMSE, bias and evaluation coverage. |

### Forecast Endpoint

The `/forecast` endpoint:
- Accepts a delivery day and decision cutoff.
- Filters forecasts based on publication timestamps.
- Selects the latest eligible forecast for each delivery hour.
- Returns forecast and corresponding actual generation data.

### Accuracy Endpoint

The `/accuracy` endpoint:
- Evaluates the 31 historical decision days.
- Applies the selected decision cutoff.
- Calculates MAE, RMSE and bias.
- Reports evaluated intervals and missing decision days.

## 6. Data Pipeline

WindWatch uses two Elexon datasets:

### FUELHH — Actual Generation
- Contains half-hourly generation records.
- Wind generation records are selected.
- Actual generation is aggregated into hourly averages for comparison with forecasts.

### WINDFOR — Wind Forecasts
- Contains wind generation forecasts.
- Forecast publication timestamps (`publishTime`) are retained to support historical decision-time filtering.

### Evaluation Period

- Decision dates: 1 January – 31 January 2026.
- Delivery dates: 2 January – 1 February 2026.
- January in the UK uses GMT (UTC), so the evaluation period does not cross a daylight-saving transition.

## 7. Forecast Selection Logic

For a selected delivery day and decision cutoff, the backend follows three steps:

1. Filter forecasts for the selected delivery day.
2. Exclude forecasts published after the decision cutoff.
3. Sort by publication time and retain the latest eligible forecast for each delivery hour.

Actual generation is aggregated to hourly averages and joined after forecast selection. This ensures actual generation does not influence which forecast is selected.

Half-hourly actual generation records are averaged into hourly values to align with the hourly forecast intervals.

## 8. Accuracy Methodology

Forecast error is calculated as:

`Error = Forecast - Actual`

The application calculates:

- **MAE (Mean Absolute Error):** Average magnitude of forecast errors.
- **RMSE (Root Mean Squared Error):** Gives greater weight to larger errors.
- **Bias:** Mean forecast error. Positive bias indicates over-forecasting, while negative bias indicates under-forecasting.

### Verified January 2026 Results

The following results were obtained from local execution and matched the deployed API responses.

| Metric | 10:00 cutoff | 12:00 cutoff |
|---|---:|---:|
| MAE | 2,013.01 MW | 1,901.00 MW |
| RMSE | 2,505.94 MW | 2,359.13 MW |
| Bias | +1,729.93 MW | +1,687.22 MW |
| Decision days evaluated | 31 | 31 |
| Hourly intervals evaluated | 744 | 744 |
| Missing decision days | 0 | 0 |

The evaluation covers:

31 decision days × 24 hourly intervals = 744 hourly comparisons.

Additional observations at the 10:00 cutoff:

- Forecast exceeded actual generation in 84.27% of hourly comparisons.
- Average actual generation was approximately 11,284 MW.
- MAE was approximately 17.8% of average actual generation.
- 9 January had the lowest daily MAE, approximately 797 MW.
- 28 January had the highest daily MAE, approximately 5,375 MW.

At the 12:00 cutoff, MAE was approximately 5.6% lower than at 10:00 in this historical sample.

These results describe the historical sample and do not guarantee future forecast performance.

## 9. Repository Structure

```text
GreenEnergy/
│
├── backend/
│   ├── controller/
│   │   ├── accuracy.py
│   │   └── forecast.py
│   │
│   ├── routes/
│   │   ├── accuracy.py
│   │   └── forecast.py
│   │
│   ├── script/
│   │   └── scripts.py
│   │
│   ├── data/
│   │   ├── actuals.csv
│   │   └── forecasts.csv
│   │
│   ├── app.py
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   └── pages/
    │       ├── Forecast.jsx
    │       └── Accuracy.jsx
    │
    ├── package.json
    └── vercel.json
```

*Note: This is a partial tree of the identified files, not a complete listing of every frontend component or configuration file.*

### Important Files

| File | Responsibility |
|---|---|
| `backend/app.py` | FastAPI application entry point and configuration |
| `backend/script/scripts.py` | Elexon data-fetching script |
| `backend/controller/forecast.py` | Forecast processing and selection |
| `backend/controller/accuracy.py` | Accuracy calculation |
| `backend/routes/forecast.py` | Forecast API route |
| `backend/routes/accuracy.py` | Accuracy API route |
| `backend/data/actuals.csv` | Historical actual generation data |
| `backend/data/forecasts.csv` | Historical forecast data |
| `frontend/src/pages/Forecast.jsx` | Forecast page |
| `frontend/src/pages/Accuracy.jsx` | Accuracy page |
| `frontend/vercel.json` | Vercel routing configuration |

## 10. Running the Application Locally

### Prerequisites

- Python version compatible with the backend dependencies.
- Node.js and npm.
- Git.

### Step 1: Clone the Repository

```bash
git clone YOUR_REPOSITORY_URL
cd YOUR_REPOSITORY_NAME
```

### Step 2: Start the Backend

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment.

**Windows:**

```powershell
venv\Scripts\activate
```

**macOS/Linux:**

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI server:

```bash
uvicorn app:app --reload
```

The local backend will be available at:

`http://127.0.0.1:8000`

The backend uses the historical CSV files included in the repository.

### Step 3: Start the Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL provided by Vite, usually:

`http://localhost:5173`

By default, the frontend can communicate with the deployed Render backend. If running the backend locally, update the frontend API base URL to:

`http://127.0.0.1:8000`

### CORS Configuration

The backend uses FastAPI's `CORSMiddleware` to allow cross-origin browser requests from the following origins:

- `https://wind-watch.vercel.app` — Deployed Vercel frontend.
- `http://localhost:5173` — Local frontend development.

Other origins are not included in the current CORS allowlist.
