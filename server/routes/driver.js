const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  createDriverProfile,
  updateLocation,
  toggleAvailability,
  getDriverProfile
} = require('../controllers/driverController');

router.post('/profile', authMiddleware, createDriverProfile);
router.put('/location', authMiddleware, updateLocation);
router.put('/availability', authMiddleware, toggleAvailability);
router.get('/profile', authMiddleware, getDriverProfile);

module.exports = router;