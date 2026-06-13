import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import RiderDashboard from './components/RiderDashboard';
import DriverDashboard from './components/DriverDashboard';

function App() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/rider" 
          element={token && role === 'rider' ? <RiderDashboard /> : <Navigate to="/" />} 
        />
        <Route 
          path="/driver" 
          element={token && role === 'driver' ? <DriverDashboard /> : <Navigate to="/" />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;