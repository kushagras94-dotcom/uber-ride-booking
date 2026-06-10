const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const User = require('../models/User');

// Helper function - calculate distance between two coordinates
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// Helper function - calculate fare
const calculateFare = (distanceKm) => {
  const baseFare = 50;
  const perKmRate = 12;
  return Math.round(baseFare + (distanceKm * perKmRate));
};

// REQUEST A RIDE (rider)
exports.requestRide = async (req, res) => {
  try {
    const { pickup, destination } = req.body;

    // Find all available drivers
    const availableDrivers = await Driver.find({ isAvailable: true });

    if (availableDrivers.length === 0) {
      return res.status(404).json({ message: 'No drivers available' });
    }

    // Find nearest driver using Haversine formula
    let nearestDriver = null;
    let shortestDistance = Infinity;

    availableDrivers.forEach(driver => {
      const distance = calculateDistance(
        pickup.lat, pickup.lng,
        driver.location.lat, driver.location.lng
      );
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestDriver = driver;
      }
    });

    // Calculate fare based on distance between pickup and destination
    const rideDistance = calculateDistance(
      pickup.lat, pickup.lng,
      destination.lat, destination.lng
    );
    const fare = calculateFare(rideDistance);

    // Create the ride
    const ride = await Ride.create({
      riderId: req.user.id,
      driverId: nearestDriver._id,
      pickup,
      destination,
      fare,
      status: 'requested'
    });

    res.status(201).json({
      message: 'Ride requested successfully',
      ride,
      nearestDriverDistance: shortestDistance.toFixed(2) + ' km',
      estimatedFare: '₹' + fare
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ACCEPT A RIDE (driver)
exports.acceptRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    if (ride.status !== 'requested') {
      return res.status(400).json({ message: 'Ride is no longer available' });
    }

    // Update ride status
    ride.status = 'accepted';
    await ride.save();

    // Mark driver as unavailable
    await Driver.findByIdAndUpdate(ride.driverId, { isAvailable: false });

    res.status(200).json({ message: 'Ride accepted', ride });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// UPDATE RIDE STATUS (driver)
exports.updateRideStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    ride.status = status;
    await ride.save();

    // If ride completed or cancelled, mark driver available again
    if (status === 'completed' || status === 'cancelled') {
      await Driver.findByIdAndUpdate(ride.driverId, { isAvailable: true });
    }

    res.status(200).json({ message: 'Ride status updated', ride });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET ALL RIDES FOR A USER
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

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    res.status(200).json(ride);

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};