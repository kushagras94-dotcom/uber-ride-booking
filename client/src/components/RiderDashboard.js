import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const API = 'https://expert-robot-x56q9xxq46p9hpwv6-5000.app.github.dev/api';
const SOCKET_URL = 'https://expert-robot-x56q9xxq46p9hpwv6-5000.app.github.dev';

function RiderDashboard() {
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [ride, setRide] = useState(null);
  const [status, setStatus] = useState('');
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const name = localStorage.getItem('name');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) navigate('/');
  }, []);

  const requestRide = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API}/rides/request`, {
        pickup: { lat: 26.9124, lng: 75.7873, address: pickup },
        destination: { lat: 26.8500, lng: 75.8000, address: destination }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setRide(res.data);
      setStatus('requested');

      // Connect to WebSocket and join ride room
      const socket = io(SOCKET_URL);
      socket.emit('ride:join', res.data.ride._id);

      socket.on('driver:locationUpdate', (data) => {
        setDriverLocation(data);
      });

      socket.on('ride:statusChanged', (data) => {
        setStatus(data.status);
      });

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request ride');
    }
    setLoading(false);
  };

  const logout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Welcome, {name} 👋</h2>
        <button onClick={logout} style={styles.logoutBtn}>Logout</button>
      </div>

      {!ride ? (
        <div style={styles.card}>
          <h3>Book a Ride</h3>
          {error && <p style={styles.error}>{error}</p>}
          <input
            style={styles.input}
            placeholder="Pickup location"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
          />
          <input
            style={styles.input}
            placeholder="Destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
          <button
            style={styles.button}
            onClick={requestRide}
            disabled={loading || !pickup || !destination}
          >
            {loading ? 'Finding driver...' : 'Request Ride'}
          </button>
        </div>
      ) : (
        <div style={styles.card}>
          <h3>Ride Status</h3>
          <div style={styles.statusBadge}>{status.toUpperCase()}</div>
          <p><strong>Fare:</strong> {ride.estimatedFare}</p>
          <p><strong>Distance:</strong> {ride.roadDistance}</p>
          <p><strong>Driver arrives in:</strong> {ride.estimatedDriverArrival}</p>
          {driverLocation && (
            <div style={styles.locationBox}>
              <p>📍 Driver Location:</p>
              <p>Lat: {driverLocation.lat}, Lng: {driverLocation.lng}</p>
            </div>
          )}
          <button style={styles.button} onClick={() => setRide(null)}>Book Another Ride</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: '600px', margin: '0 auto', padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
  card: { background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' },
  input: { width: '100%', padding: '12px', marginBottom: '1rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px', boxSizing: 'border-box' },
  button: { width: '100%', padding: '12px', backgroundColor: '#000', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' },
  logoutBtn: { padding: '8px 16px', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  statusBadge: { backgroundColor: '#000', color: 'white', padding: '8px 16px', borderRadius: '20px', display: 'inline-block', marginBottom: '1rem' },
  locationBox: { backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '8px', marginTop: '1rem' },
  error: { color: 'red', marginBottom: '1rem' }
};

export default RiderDashboard;