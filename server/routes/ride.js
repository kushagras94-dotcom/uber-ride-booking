const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  requestRide,
  acceptRide,
  updateRideStatus,
  getMyRides,
  getRide
} = require('../controllers/rideController');

router.post('/request', authMiddleware, requestRide);
router.put('/accept/:id', authMiddleware, acceptRide);
router.put('/status/:id', authMiddleware, updateRideStatus);
router.get('/my-rides', authMiddleware, getMyRides);
router.get('/:id', authMiddleware, getRide);

module.exports = router;