const { io } = require('socket.io-client');

const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('Connected to WebSocket server!');

  // Simulate rider joining ride room
  socket.emit('ride:join', 'test-ride-123');
  console.log('Rider joined ride room');

  // Simulate driver sending location update
  setTimeout(() => {
    socket.emit('driver:location', {
      driverId: 'driver-001',
      rideId: 'test-ride-123',
      lat: 26.9124,
      lng: 75.7873
    });
    console.log('Driver sent location update');
  }, 1000);
});

// Rider receives live location update
socket.on('driver:locationUpdate', (data) => {
  console.log('LIVE UPDATE RECEIVED:', data);
  socket.disconnect();
});