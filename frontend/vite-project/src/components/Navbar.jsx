import React from 'react'
import "./Navbar.css"
import { Link } from 'react-router-dom'
const Navbar = () => {
  return (
    <div>
      <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="logo">
          <span className="logo-mark">W</span>
          <span className="logo-text">WindWatch</span>
        </Link>

        <nav className="nav-links">
          <Link to="/" end>Overview</Link>
          <Link to="/forecast">Forecast</Link>
          <Link to="/accuracy">Accuracy</Link>
        </nav>

        <Link to="/forecast" className="nav-cta">
          Open Dashboard
        </Link>
      </div>
    </header>
    </div>
  )
}

export default Navbar
