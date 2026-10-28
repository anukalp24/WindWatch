
import React, { useEffect, useState } from "react";
import Navbar from "../../Navbar";
import "./Forecast.css";

const API_URL = "https://windwatch.onrender.com/forecast";

const Forecast = () => {
  const [forecasts, setForecasts] = useState([]);
  const [deliveryDay, setDeliveryDay] = useState("2026-01-02");
  const [decisionCutoff, setDecisionCutoff] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(API_URL)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load forecasts");
        return response.json();
      })
      .then((result) => setForecasts(result.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const cutoff = decisionCutoff
    ? new Date(`${decisionCutoff}:00Z`).getTime()
    : Infinity;

  const latestForecasts = {};

  forecasts.forEach((item) => {
    const sameDay = item.startTime.startsWith(deliveryDay);
    const publishedInTime =
      new Date(item.publishTime).getTime() <= cutoff;

    if (!sameDay || !publishedInTime) return;

    const previous = latestForecasts[item.startTime];

    if (
      !previous ||
      new Date(item.publishTime) > new Date(previous.publishTime)
    ) {
      latestForecasts[item.startTime] = item;
    }
  });

  const rows = Object.values(latestForecasts).sort(
    (a, b) => new Date(a.startTime) - new Date(b.startTime)
  );

  const values = rows.map((item) => Number(item.generation));
  const average = values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;

  const formatNumber = (value) =>
    Number(value).toLocaleString("en-GB", {
      maximumFractionDigits: 2,
    });

  const formatTime = (value) =>
    new Date(value).toLocaleTimeString("en-GB", {
      timeZone: "Europe/London",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatDateTime = (value) =>
    new Date(value).toLocaleString("en-GB", {
      timeZone: "Europe/London",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <>
      <Navbar />

      <main className="forecast-page">
        <div className="container">
          <h1 className="page-title">Forecast for Decision</h1>
          <p className="page-sub">
            Hourly wind forecasts available before the selected cutoff.
          </p>

          <div className="controls">
            <label className="field">
              <span>Delivery day</span>
              <input
                type="date"
                min="2026-01-02"
                max="2026-02-01"
                value={deliveryDay}
                onChange={(e) => setDeliveryDay(e.target.value)}
              />
            </label>

            <label className="field">
              <span>Decision cutoff (UK time)</span>
              <input
                type="datetime-local"
                value={decisionCutoff}
                onChange={(e) => setDecisionCutoff(e.target.value)}
              />
            </label>
          </div>

          {loading && <p>Loading forecasts...</p>}
          {error && <p role="alert">{error}</p>}

          {!loading && !error && (
            <>
              <div className="cards">
                <div className="card">
                  <span className="card-value">
                    {average === null ? "--" : formatNumber(average)}
                  </span>
                  <span className="card-label">Average forecast (MW)</span>
                </div>

                <div className="card">
                  <span className="card-value">
                    {values.length ? formatNumber(Math.max(...values)) : "--"}
                  </span>
                  <span className="card-label">Peak forecast (MW)</span>
                </div>

                <div className="card">
                  <span className="card-value">
                    {values.length ? formatNumber(Math.min(...values)) : "--"}
                  </span>
                  <span className="card-label">Lowest forecast (MW)</span>
                </div>
              </div>

              <section className="chart-box">
                <h2>Hourly Wind Generation (MW)</h2>

                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Hour (UK)</th>
                        <th>Forecast (MW)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((item) => (
                        <tr key={item.startTime}>
                          <td>{formatTime(item.startTime)}</td>
                          <td>{formatNumber(item.generation)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!rows.length && (
                  <p>No eligible forecasts found for this date and cutoff.</p>
                )}
              </section>

              <section className="table-box">
                <h2>Forecast vs Actual</h2>

                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Hour (UK)</th>
                        <th>Forecast (MW)</th>
                        <th>Published at (UK)</th>
                        <th>Actual hourly average (MW)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((item) => (
                        <tr key={item.startTime}>
                          <td>{formatTime(item.startTime)}</td>
                          <td>{formatNumber(item.generation)}</td>
                          <td>{formatDateTime(item.publishTime)}</td>
                          <td>
                            {item.actual == null
                              ? "--"
                              : formatNumber(item.actual)}
                          </td>
                        </tr>
                      ))}
                      {!rows.length && (
                        <tr>
                          <td colSpan="4">No matching data available.</td>
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

export default Forecast;
