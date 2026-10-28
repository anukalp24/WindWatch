import React from "react";
import { Link } from "react-router-dom";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-top">
          <Link to="/" className="footer-logo" aria-label="WindWatch home">
            <span className="footer-logo-mark" aria-hidden="true">W</span>
            <span className="footer-logo-text">WindWatch</span>
          </Link>

          <nav className="footer-links" aria-label="Footer">
            <Link to="/">Overview</Link>
            <Link to="/forecast">Forecast</Link>
            <Link to="/accuracy">Accuracy</Link>
          </nav>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} WindWatch. All rights reserved.</p>
          <p>Data: Elexon, national level, January 2026.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;