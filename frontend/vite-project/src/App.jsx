import { useState } from 'react'
import './App.css'

import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./components/Pages/Home/Home"
import Accuracy from "./components/Pages/Accuracy/Accuracy"
import Forecast from "./components/Pages/Forecast/Forecast"


function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/forecast" element={<Forecast />} />
        <Route path="/accuracy" element={<Accuracy />} />
      </Routes>
    </>
  )
}

export default App
