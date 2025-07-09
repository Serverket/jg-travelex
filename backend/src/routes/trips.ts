import express from 'express';
import {
  getAllTrips,
  getTripsByUserId,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip
} from '../controllers/tripController';

const router = express.Router();

// GET all trips
router.get('/', getAllTrips);

// GET trips by user ID
router.get('/user/:userId', getTripsByUserId);

// GET single trip
router.get('/:id', getTripById);

// POST create trip
router.post('/', createTrip);

// PUT update trip
router.put('/:id', updateTrip);

// DELETE trip
router.delete('/:id', deleteTrip);

export default router;
