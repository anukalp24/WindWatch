import React from "react";
import { Link, NavLink } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="logo" aria-label="WindWatch home">
          <span className="logo-mark" aria-hidden="true">W</span>
          <span className="logo-text">WindWatch</span>
        </Link>

        <nav className="nav-links" aria-label="Primary">
          <NavLink to="/" end>Overview</NavLink>
          <NavLink to="/forecast">Forecast</NavLink>
          <NavLink to="/accuracy">Accuracy</NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;