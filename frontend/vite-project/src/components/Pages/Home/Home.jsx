import { Link } from "react-router-dom";
import Navbar from "../../Navbar";
import "./Home.css";
import Footer from "../Footer/Footer";

export default function Home() {
  return (
    <main>
<Navbar/>
      <section className="hero">
        <div className="container">
          <h1>
            The Wind Forecast Platform for{" "}
            <span className="green">Day-Ahead Decisions</span>
          </h1>

          <p className="hero-sub">
            <strong className="green">WindWatch</strong> shows you the latest
            wind generation forecast available at decision time, and measures
            exactly how wrong it tends to be. Know how much to buy from thermal
            plants, with the error quantified. Built on{" "}
            <strong>Elexon</strong> national-level data for January 2026.
          </p>

          <div className="hero-actions">
            <Link to="/forecast" className="btn btn-primary">
              View Forecast →
            </Link>
            <Link to="/accuracy" className="btn btn-outline">
              See Accuracy
            </Link>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container feature-grid">
          <Link to="/forecast" className="feature-card">
            <span className="feature-tag">01</span>
            <h3>Forecast at decision time</h3>
            <p>
              Pick a delivery day and see the latest wind forecast published
              before the day-ahead cutoff, half-hour by half-hour.
            </p>
            <span className="feature-link">Open forecast →</span>
          </Link>

          <Link to="/accuracy" className="feature-card">
            <span className="feature-tag">02</span>
            <h3>Quantified forecast error</h3>
            <p>
              MAE, RMSE, bias and percentile errors by hour and by forecast
              horizon, so you can size your buffer with confidence.
            </p>
            <span className="feature-link">Open accuracy →</span>
          </Link>
        </div>
      </section>
      <Footer/>
    </main>
  );
}