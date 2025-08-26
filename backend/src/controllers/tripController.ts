import type { Request, Response } from 'express';
import TripModel, { type Trip } from '../models/trips';

export const getAllTrips = async (req: Request, res: Response): Promise<void> => {
  try {
    const trips = await TripModel.findAll();
    res.status(200).json(trips);
  } catch (error) {
    console.error('Error getting trips:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTripsByUserId = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId);
    const trips = await TripModel.findByUserId(userId);
    res.status(200).json(trips);
  } catch (error) {
    console.error('Error getting trips by user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTripById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const trip = await TripModel.findById(id);
    
    if (!trip) {
      res.status(404).json({ message: 'Trip not found' });
      return;
    }
    
    res.status(200).json(trip);
  } catch (error) {
    console.error('Error getting trip:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createTrip = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Creating trip...');
    
    const {
      user_id,
      origin,
      destination,
      distance,
      duration,
      date,
      price,
      activeSurcharges
    } = req.body;
    
    console.log('Extracted trip data:', { 
      user_id, origin, destination, distance, duration, date, price,
      activeSurcharges: activeSurcharges || []
    });
    
    // Basic validation
    if (!user_id || !origin || !destination || distance === undefined || !date || price === undefined) {
      console.error('Validation error: Required fields missing', { 
        user_id_present: !!user_id, 
        origin_present: !!origin, 
        destination_present: !!destination, 
        distance_present: distance !== undefined,
        date_present: !!date, 
        price_present: price !== undefined 
      });
      res.status(400).json({ message: 'Required fields are missing' });
      return;
    }
    
    // Parse numeric values
    const parsedDistance = parseFloat(distance);
    const parsedPrice = parseFloat(price);
    const parsedDuration = duration ? parseFloat(duration) : undefined;
    const parsedUserId = parseInt(user_id);
    
    console.log('Parsed values:', { parsedDistance, parsedPrice, parsedDuration, parsedUserId });
    
    if (isNaN(parsedDistance) || parsedDistance < 0) {
      res.status(400).json({ message: 'Distance must be a valid non-negative number' });
      return;
    }
    
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      res.status(400).json({ message: 'Price must be a valid non-negative number' });
      return;
    }
    
    // Validate activeSurcharges if present
    let sanitizedSurcharges = [];
    if (activeSurcharges) {
      if (!Array.isArray(activeSurcharges)) {
        console.error('activeSurcharges is not an array:', activeSurcharges);
        // Try to parse it if it's a string
        try {
          if (typeof activeSurcharges === 'string') {
            sanitizedSurcharges = JSON.parse(activeSurcharges);
            console.log('Parsed activeSurcharges from string:', sanitizedSurcharges);
          }
        } catch (e) {
          console.error('Failed to parse activeSurcharges string:', e);
          sanitizedSurcharges = [];
        }
      } else {
        sanitizedSurcharges = activeSurcharges.filter(id => !isNaN(parseInt(id)));
        console.log('Filtered activeSurcharges:', sanitizedSurcharges);
      }
    }
    
    // Create new trip
    console.log('Attempting to create trip in database');
    const tripData = {
      user_id: parsedUserId,
      origin,
      destination,
      distance: parsedDistance,
      duration: parsedDuration,
      date,
      price: parsedPrice,
      activeSurcharges: sanitizedSurcharges
    };
    console.log('Trip data being sent to model:', tripData);
    
    const tripId = await TripModel.create(tripData);
    
    console.log('Trip created successfully with ID:', tripId);
    res.status(201).json({
      message: 'Trip created successfully',
      tripId
    });
  } catch (error) {
    console.error('Error creating trip:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateTrip = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const {
      user_id,
      origin,
      destination,
      distance,
      duration,
      date,
      price,
      activeSurcharges
    } = req.body;
    
    // Check if trip exists
    const existingTrip = await TripModel.findById(id);
    if (!existingTrip) {
      res.status(404).json({ message: 'Trip not found' });
      return;
    }
    
    // Build update data
    const updateData: Partial<Trip> = {};
    
    if (user_id !== undefined) updateData.user_id = parseInt(user_id);
    if (origin !== undefined) updateData.origin = origin;
    if (destination !== undefined) updateData.destination = destination;
    
    if (distance !== undefined) {
      const parsedDistance = parseFloat(distance);
      if (isNaN(parsedDistance) || parsedDistance < 0) {
        res.status(400).json({ message: 'Distance must be a valid non-negative number' });
        return;
      }
      updateData.distance = parsedDistance;
    }
    
    if (duration !== undefined) {
      const parsedDuration = parseFloat(duration);
      if (isNaN(parsedDuration)) {
        res.status(400).json({ message: 'Duration must be a valid number' });
        return;
      }
      updateData.duration = parsedDuration;
    }
    
    if (date !== undefined) updateData.date = date;
    
    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        res.status(400).json({ message: 'Price must be a valid non-negative number' });
        return;
      }
      updateData.price = parsedPrice;
    }
    
    if (activeSurcharges !== undefined) updateData.activeSurcharges = activeSurcharges;
    
    // Update trip
    const success = await TripModel.update(id, updateData);
    
    if (!success) {
      res.status(400).json({ message: 'Failed to update trip' });
      return;
    }
    
    res.status(200).json({ message: 'Trip updated successfully' });
  } catch (error) {
    console.error('Error updating trip:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteTrip = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    
    // Check if trip exists
    const existingTrip = await TripModel.findById(id);
    if (!existingTrip) {
      res.status(404).json({ message: 'Trip not found' });
      return;
    }
    
    // Delete trip
    const success = await TripModel.delete(id);
    
    if (!success) {
      res.status(400).json({ message: 'Failed to delete trip' });
      return;
    }
    
    res.status(200).json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Error deleting trip:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
