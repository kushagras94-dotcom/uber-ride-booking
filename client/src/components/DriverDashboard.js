import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const API = 'https://uber-ride-booking-backend.onrender.com/api';
const SOCKET_URL = 'https://uber-ride-booking-backend.onrender.com';

function DriverDashboard() {
  const [available, setAvailable] = useState(true);
  const [currentRide, setCurrentRide] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [responding, setResponding] = useState(false);
  const navigate = useNavigate();
  const name = localStorage.getItem('name');
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    if (!token) navigate('/');
    setupDriver();
  }, []);

  const setupDriver = async () => {
    try {
      // Create driver profile if not exists
      await axios.post(`${API}/driver/profile`, {
        lat: 26.9124, lng: 75.7873
      }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      // Profile may already exist, that's fine
    }

    // Connect to WebSocket
    const newSocket = io(SOCKET_URL);
    newSocket.emit('driver:join', userId);

    // Listen for new ride requests sent directly to this driver
    newSocket.on('ride:newRequest', (data) => {
      setIncomingRequest(data);
      setCurrentRide(data.rideId);
    });

    setSocket(newSocket);
  };

  const toggleAvailability = async () => {
    setLoading(true);
    try {
      const res = await axios.put(`${API}/driver/availability`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailable(res.data.driver.isAvailable);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const acceptRide = async () => {
    setResponding(true);
    try {
      await axios.put(`${API}/rides/accept/${incomingRequest.rideId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIncomingRequest(null);
    } catch (err) {
      alert('Could not accept ride: ' + (err.response?.data?.message || 'unknown error'));
    }
    setResponding(false);
  };

  const rejectRide = async () => {
    setResponding(true);
    try {
      await axios.put(`${API}/rides/reject/${incomingRequest.rideId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIncomingRequest(null);
      setCurrentRide(null);
    } catch (err) {
      alert('Could not reject ride: ' + (err.response?.data?.message || 'unknown error'));
    }
    setResponding(false);
  };
  const simulateLocationUpdate = () => {
    if (socket && currentRide) {
      const newLat = 26.9124 + (Math.random() * 0.01);
      const newLng = 75.7873 + (Math.random() * 0.01);
      socket.emit('driver:location', {
        driverId: userId,
        rideId: currentRide,
        lat: newLat,
        lng: newLng
      });
      alert(`Location updated: ${newLat.toFixed(4)}, ${newLng.toFixed(4)}`);
    } else {
      alert('Enter a ride ID first');
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Driver: {name} 🚗</h2>
        <button onClick={logout} style={styles.logoutBtn}>Logout</button>
      </div>

      <div style={styles.card}>
        <h3>Status</h3>
        <div style={{ ...styles.statusBadge, backgroundColor: available ? 'green' : 'red' }}>
          {available ? 'AVAILABLE' : 'UNAVAILABLE'}
        </div>
        <button style={styles.button} onClick={toggleAvailability} disabled={loading}>
          {loading ? 'Updating...' : `Go ${available ? 'Offline' : 'Online'}`}
        </button>
      </div>
      {incomingRequest && (
        <div style={{ ...styles.card, backgroundColor: '#fff8e1', border: '2px solid #ffa000' }}>
          <h3>🚗 New Ride Request!</h3>
          <p>Fare: ₹{incomingRequest.fare}</p>
          <p>Distance: {incomingRequest.roadDistance || 'Calculating...'}</p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              style={{ ...styles.button, backgroundColor: '#2e7d32', marginTop: 0 }}
              onClick={acceptRide}
              disabled={responding}
            >
              ✅ Accept
            </button>
            <button
              style={{ ...styles.button, backgroundColor: '#c62828', marginTop: 0 }}
              onClick={rejectRide}
              disabled={responding}
            >
              ❌ Reject
            </button>
          </div>
        </div>
      )}
      <div style={styles.card}>
        <h3>Simulate Live Tracking</h3>
        <input
          style={styles.input}
          placeholder="Enter Ride ID"
          value={currentRide || ''}
          onChange={(e) => setCurrentRide(e.target.value)}
        />
        <button style={styles.button} onClick={simulateLocationUpdate}>
          📍 Send Location Update
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: '600px', margin: '0 auto', padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
  card: { background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', marginBottom: '1rem' },
  input: { width: '100%', padding: '12px', marginBottom: '1rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px', boxSizing: 'border-box' },
  button: { width: '100%', padding: '12px', backgroundColor: '#000', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', marginTop: '0.5rem' },
  logoutBtn: { padding: '8px 16px', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  statusBadge: { color: 'white', padding: '8px 16px', borderRadius: '20px', display: 'inline-block', marginBottom: '1rem' }
};

export default DriverDashboard;