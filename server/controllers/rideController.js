const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const axios = require('axios');

// Get real road distance and duration using OpenRouteService
const getRoadDistance = async (fromLng, fromLat, toLng, toLat) => {
  try {
    const response = await axios.get(
      `https://api.openrouteservice.org/v2/directions/driving-car`,
      {
        params: {
          api_key: process.env.ORS_API_KEY,
          start: `${fromLng},${fromLat}`,
          end: `${toLng},${toLat}`
        }
      }
    );
    const summary = response.data.features[0].properties.summary;
    return {
      distanceKm: (summary.distance / 1000).toFixed(2),
      durationMins: Math.round(summary.duration / 60)
    };
  } catch (error) {
    // Fallback to Haversine if API fails
    return null;
  }
};

// Haversine as fallback
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Calculate fare
const calculateFare = (distanceKm) => {
  const baseFare = 50;
  const perKmRate = 12;
  return Math.round(baseFare + (distanceKm * perKmRate));
};

// REQUEST A RIDE
exports.requestRide = async (req, res) => {
  try {
    const { pickup, destination } = req.body;

    const availableDrivers = await Driver.find({ isAvailable: true });

    if (availableDrivers.length === 0) {
      return res.status(404).json({ message: 'No drivers available' });
    }

    // Find nearest driver using real road distance
    let nearestDriver = null;
    let shortestDuration = Infinity;
    let nearestDriverInfo = null;

    for (const driver of availableDrivers) {
      const roadData = await getRoadDistance(
        pickup.lng, pickup.lat,
        driver.location.lng, driver.location.lat
      );

      if (roadData) {
        if (roadData.durationMins < shortestDuration) {
          shortestDuration = roadData.durationMins;
          nearestDriver = driver;
          nearestDriverInfo = roadData;
        }
      } else {
        // Fallback to Haversine
        const dist = haversineDistance(
          pickup.lat, pickup.lng,
          driver.location.lat, driver.location.lng
        );
        if (dist < shortestDuration) {
          shortestDuration = dist;
          nearestDriver = driver;
        }
      }
    }

    // Get road distance between pickup and destination for fare
    const rideRoadData = await getRoadDistance(
      pickup.lng, pickup.lat,
      destination.lng, destination.lat
    );

    const rideDistanceKm = rideRoadData
      ? rideRoadData.distanceKm
      : haversineDistance(pickup.lat, pickup.lng, destination.lat, destination.lng);

    const fare = calculateFare(rideDistanceKm);

    const ride = await Ride.create({
      riderId: req.user.id,
      driverId: nearestDriver._id,
      pickup,
      destination,
      fare,
      status: 'requested'
    });
    // Notify the matched driver instantly via Socket.io
    const io = req.app.get('io');
    console.log('Attempting to notify driver room:', `driver:${nearestDriver.userId}`);
    if (io) {
      io.to(`driver:${nearestDriver.userId}`).emit('ride:newRequest', {
        rideId: ride._id,
        pickup,
        destination,
        fare,
        roadDistance: rideRoadData ? `${rideRoadData.distanceKm} km` : null
      });
    }

    res.status(201).json({
      message: 'Ride requested successfully',
      ride,
      estimatedDriverArrival: nearestDriverInfo
        ? `${nearestDriverInfo.durationMins} mins`
        : 'Calculating...',
      roadDistance: rideRoadData
        ? `${rideRoadData.distanceKm} km`
        : 'Calculating...',
      estimatedFare: '₹' + fare
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ACCEPT A RIDE
exports.acceptRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'requested') {
      return res.status(400).json({ message: 'Ride no longer available' });
    }
    ride.status = 'accepted';
    await ride.save();
    await Driver.findByIdAndUpdate(ride.driverId, { isAvailable: false });
    res.status(200).json({ message: 'Ride accepted', ride });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// REJECT A RIDE
exports.rejectRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'requested') {
      return res.status(400).json({ message: 'Ride no longer available' });
    }
    ride.status = 'cancelled';
    await ride.save();
    res.status(200).json({ message: 'Ride rejected', ride });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// UPDATE RIDE STATUS
exports.updateRideStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    ride.status = status;
    await ride.save();
    if (status === 'completed' || status === 'cancelled') {
      await Driver.findByIdAndUpdate(ride.driverId, { isAvailable: true });
    }
    res.status(200).json({ message: 'Ride status updated', ride });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET MY RIDES
exports.getMyRides = async (req, res) => {
  try {
    const rides = await Ride.find({ riderId: req.user.id })
      .sort({ createdAt: -1 });
    res.status(200).json(rides);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET SINGLE RIDE
exports.getRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('riderId', 'name email')
      .populate('driverId');
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    res.status(200).json(ride);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};