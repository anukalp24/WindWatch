
import React, { useEffect, useState } from "react";
import Navbar from "../../Navbar";
import "./Forecast.css";
import Footer from "../Footer/Footer";

const API_URL = "https://windwatch.onrender.com/forecast";

const Forecast = () => {
  const [forecasts, setForecasts] = useState([]);
  const [deliveryDay, setDeliveryDay] = useState("2026-01-02");
  const [decisionCutoff, setDecisionCutoff] = useState("2026-01-01T10:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!deliveryDay || !decisionCutoff) {
      setForecasts([]);
      return;
    }

    const fetchForecasts = async () => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
          delivery_day: deliveryDay,
          decision_cutoff: decisionCutoff,
        });

        const response = await fetch(`${API_URL}?${params}`);

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(
            result.detail || `Failed to load forecasts (${response.status})`
          );
        }

        const result = await response.json();

        if (!Array.isArray(result.data)) {
          throw new Error("The API returned an invalid forecast response.");
        }

        setForecasts(result.data);
      } catch (err) {
        setForecasts([]);
        setError(err.message || "Unable to load forecast data.");
      } finally {
        setLoading(false);
      }
    };

    fetchForecasts();
  }, [deliveryDay, decisionCutoff]);

  const values = forecasts
    .map((item) => Number(item.generation))
    .filter(Number.isFinite);

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
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const rows = [...forecasts].sort(
    (a, b) => new Date(a.startTime) - new Date(b.startTime)
  );

  return (
    <>
      <Navbar />

      <main className="forecast-page">
        <div className="container">
          <h1 className="page-title">Forecast for Decision</h1>

          <p className="page-sub">
            Latest hourly wind forecasts available before the selected
            day-ahead decision cutoff.
          </p>

          <div className="controls">
            <label className="field">
              <span>Delivery day</span>
              <input
                type="date"
                min="2026-01-02"
                max="2026-02-01"
                value={deliveryDay}
                onChange={(e) => {
                  const nextDeliveryDay = e.target.value;
                  setDeliveryDay(nextDeliveryDay);

                  if (nextDeliveryDay) {
                    const previousDay = new Date(
                      `${nextDeliveryDay}T00:00:00Z`
                    );
                    previousDay.setUTCDate(previousDay.getUTCDate() - 1);

                    const year = previousDay.getUTCFullYear();
                    const month = String(
                      previousDay.getUTCMonth() + 1
                    ).padStart(2, "0");
                    const day = String(
                      previousDay.getUTCDate()
                    ).padStart(2, "0");

                    setDecisionCutoff(`${year}-${month}-${day}T10:00`);
                  }
                }}
              />
            </label>

            <label className="field">
              <span>Decision cutoff (UK time)</span>
              <input
                type="datetime-local"
                value={decisionCutoff}
                onChange={(e) => setDecisionCutoff(e.target.value)}
                required
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
                    {values.length
                      ? formatNumber(Math.max(...values))
                      : "--"}
                  </span>
                  <span className="card-label">Peak forecast (MW)</span>
                </div>

                <div className="card">
                  <span className="card-value">
                    {values.length
                      ? formatNumber(Math.min(...values))
                      : "--"}
                  </span>
                  <span className="card-label">Lowest forecast (MW)</span>
                </div>
              </div>

              <section className="table-box">
                <h2>Forecast vs Actual</h2>

                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Delivery date</th>
                        <th>Hour (UK)</th>
                        <th>Forecast (MW)</th>
                        <th>Published at (UK)</th>
                        <th>Actual hourly average (MW)</th>
                      </tr>
                    </thead>

                    <tbody>
                      {rows.map((item) => (
                        <tr key={item.startTime}>
                          <td>
                            {new Date(item.startTime).toLocaleDateString(
                              "en-GB",
                              {
                                timeZone: "Europe/London",
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </td>
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
                          <td colSpan="5">
                            No eligible forecasts found for this delivery day
                            and decision cutoff.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>

        <Footer />
      </main>
    </>
  );
};

export default Forecast;
