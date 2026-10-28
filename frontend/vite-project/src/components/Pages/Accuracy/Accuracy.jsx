
import React, { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import Navbar from "../../Navbar";
import "./Accuracy.css";

const API_URL = "https://windwatch.onrender.com/accuracy";

const formatNumber = (value) =>
  Number(value).toLocaleString("en-GB", {
    maximumFractionDigits: 2,
  });

const formatDate = (date) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });

const Accuracy = () => {
  const [cutoffTime, setCutoffTime] = useState("10:00");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const calculateAccuracy = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        `${API_URL}?cutoff_time=${encodeURIComponent(cutoffTime)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to calculate accuracy.");
      }

      setResult(data);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const rows = (result?.data ?? [])
    .map((item) => ({
      ...item,
      forecast: Number(item.forecast),
      actual: Number(item.actual),
      error: Number(item.error),
      time: new Date(item.startTime).toLocaleString("en-GB", {
        timeZone: "Europe/London",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const dailyMap = new Map();

  rows.forEach((item) => {
    if (!dailyMap.has(item.deliveryDate)) {
      dailyMap.set(item.deliveryDate, {
        deliveryDate: item.deliveryDate,
        totalError: 0,
        count: 0,
      });
    }

    const day = dailyMap.get(item.deliveryDate);
    day.totalError += Math.abs(item.error);
    day.count += 1;
  });

  const dailyMAE = [...dailyMap.values()]
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
    .map((day) => ({
      date: formatDate(day.deliveryDate),
      mae: day.totalError / day.count,
    }));

  return (
    <>
      <Navbar />

      <main className="accuracy-page">
        <div className="container">
          <h1 className="page-title">Forecast Accuracy</h1>
          <p className="page-sub">
            Evaluate hourly wind forecasts against actual generation for
            January 2026 purchasing decisions.
          </p>

          <form onSubmit={calculateAccuracy} className="controls">
            <label className="field">
              <span>Daily decision cutoff (UK time)</span>
              <input
                type="time"
                value={cutoffTime}
                onChange={(event) => setCutoffTime(event.target.value)}
                required
              />
            </label>

            <button type="submit" disabled={loading}>
              {loading ? "Calculating..." : "Calculate accuracy"}
            </button>
          </form>

          {error && <p role="alert">{error}</p>}
          {loading && <p>Calculating forecast accuracy...</p>}

          {result && (
            <>
              <div className="cards">
                <div className="card">
                  <span className="card-value">
                    {formatNumber(result.metrics.mae)}
                  </span>
                  <span className="card-label">MAE (MW)</span>
                </div>

                <div className="card">
                  <span className="card-value">
                    {formatNumber(result.metrics.rmse)}
                  </span>
                  <span className="card-label">RMSE (MW)</span>
                </div>

                <div className="card">
                  <span className="card-value">
                    {formatNumber(result.metrics.bias)}
                  </span>
                  <span className="card-label">Bias (MW)</span>
                </div>
              </div>

              <p className="page-sub">
                Decision days evaluated: {result.decision_days_evaluated} / 31
                <br />
                Hourly intervals evaluated: {result.intervals_evaluated}
              </p>

              {result.missing_decision_days?.length > 0 && (
                <p role="status">
                  Missing decision days:{" "}
                  {result.missing_decision_days.join(", ")}
                </p>
              )}

              <section className="chart-box">
                <h2>Forecast vs Actual Generation</h2>
                <p className="page-sub">
                  Compare predicted and actual hourly wind generation.
                </p>

                <div style={{ width: "100%", height: 350 }}>
                  <ResponsiveContainer>
                    <LineChart data={rows}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="time"
                        minTickGap={40}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        width={60}
                        tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                      />
                      <Tooltip
                        labelFormatter={(label) => `Time: ${label}`}
                        formatter={(value, name) => [
                          `${formatNumber(value)} MW`,
                          name,
                        ]}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="forecast"
                        name="Forecast"
                        stroke="#2563eb"
                        dot={false}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        name="Actual"
                        stroke="#16a34a"
                        dot={false}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="chart-box">
                <h2>Daily Mean Absolute Error</h2>
                <p className="page-sub">
                  Lower values indicate more accurate forecasts.
                </p>

                <div style={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer>
                    <BarChart data={dailyMAE}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        width={60}
                        tickFormatter={(value) =>
                          `${(value / 1000).toFixed(1)}k`
                        }
                      />
                      <Tooltip
                        formatter={(value) => [
                          `${formatNumber(value)} MW`,
                          "Daily MAE",
                        ]}
                      />
                      <Bar
                        dataKey="mae"
                        name="Daily MAE"
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="table-box">
                <h2>Hourly Forecast vs Actual Details</h2>

                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Decision date</th>
                        <th>Delivery date</th>
                        <th>Hour (UK)</th>
                        <th>Forecast (MW)</th>
                        <th>Actual (MW)</th>
                        <th>Error (MW)</th>
                      </tr>
                    </thead>

                    <tbody>
                      {rows.map((item, index) => (
                        <tr
                          key={`${item.decisionDate}-${item.startTime}-${index}`}
                        >
                          <td>{item.decisionDate}</td>
                          <td>{item.deliveryDate}</td>
                          <td>{item.time}</td>
                          <td>{formatNumber(item.forecast)}</td>
                          <td>{formatNumber(item.actual)}</td>
                          <td>{formatNumber(item.error)}</td>
                        </tr>
                      ))}

                      {rows.length === 0 && (
                        <tr>
                          <td colSpan="6">No matching data available.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
};

export default Accuracy;
