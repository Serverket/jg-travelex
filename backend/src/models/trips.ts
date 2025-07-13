import pool from '../config/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Trip {
  id?: number;
  user_id: number;
  origin: string;
  destination: string;
  distance: number;
  duration?: number;
  date: string | Date;
  price: number;
  created_at?: Date;
  updated_at?: Date;
  activeSurcharges?: number[]; // For handling surcharge IDs
}

class TripModel {
  async findAll(): Promise<Trip[]> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM trips ORDER BY date DESC'
      );
      
      const trips = rows as Trip[];
      
      // Fetch surcharge factors for each trip
      for (const trip of trips) {
        const [surcharges] = await pool.query<RowDataPacket[]>(
          'SELECT surcharge_id FROM trip_surcharges WHERE trip_id = ?',
          [trip.id]
        );
        
        trip.activeSurcharges = surcharges.map(s => s.surcharge_id);
      }
      
      return trips;
    } catch (error) {
      throw error;
    }
  }
  
  async findByUserId(userId: number): Promise<Trip[]> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM trips WHERE user_id = ? ORDER BY date DESC',
        [userId]
      );
      
      const trips = rows as Trip[];
      
      // Fetch surcharge factors for each trip
      for (const trip of trips) {
        const [surcharges] = await pool.query<RowDataPacket[]>(
          'SELECT surcharge_id FROM trip_surcharges WHERE trip_id = ?',
          [trip.id]
        );
        
        trip.activeSurcharges = surcharges.map(s => s.surcharge_id);
      }
      
      return trips;
    } catch (error) {
      throw error;
    }
  }

  async findById(id: number): Promise<Trip | null> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM trips WHERE id = ?',
        [id]
      );
      
      if (!rows.length) return null;
      
      const trip = rows[0] as Trip;
      
      // Fetch surcharge factors
      const [surcharges] = await pool.query<RowDataPacket[]>(
        'SELECT surcharge_id FROM trip_surcharges WHERE trip_id = ?',
        [trip.id]
      );
      
      trip.activeSurcharges = surcharges.map(s => s.surcharge_id);
      
      return trip;
    } catch (error) {
      throw error;
    }
  }

  async create(trip: Trip): Promise<number> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      console.log('Creating trip with data:', trip);
      
      // Insert trip
      const [result] = await connection.query<ResultSetHeader>(
        'INSERT INTO trips (user_id, origin, destination, distance, duration, date, price) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [trip.user_id, trip.origin, trip.destination, trip.distance, trip.duration, trip.date, trip.price]
      );
      
      const tripId = result.insertId;
      console.log(`Trip created successfully with ID: ${tripId}`);
      
      // Safely handle the activeSurcharges array
      const surcharges = Array.isArray(trip.activeSurcharges) ? 
        trip.activeSurcharges.filter(id => typeof id === 'number' && !isNaN(id)) : [];
      
      console.log('Filtered surcharges to insert:', surcharges);
      
      // Insert surcharge factors if any, one by one to avoid bulk insert issues
      if (surcharges.length > 0) {
        try {
          for (const surchargeId of surcharges) {
            await connection.query(
              'INSERT INTO trip_surcharges (trip_id, surcharge_id) VALUES (?, ?)',
              [tripId, surchargeId]
            );
          }
          console.log(`Added ${surcharges.length} surcharges to trip ${tripId}`);
        } catch (surchargeError) {
          console.error('Error inserting surcharges:', surchargeError);
          // Continue execution even if surcharges fail
          // Don't throw error here to allow trip creation to succeed
        }
      }
      
      await connection.commit();
      return tripId;
    } catch (error) {
      console.error('Error in trip creation:', error);
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async update(id: number, trip: Partial<Trip>): Promise<boolean> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Update trip fields
      const fieldsToUpdate = {...trip};
      delete fieldsToUpdate.id;
      delete fieldsToUpdate.created_at;
      delete fieldsToUpdate.updated_at;
      delete fieldsToUpdate.activeSurcharges;
      
      // Only update if there are fields to update
      const fields = Object.keys(fieldsToUpdate);
      if (fields.length > 0) {
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const values = fields.map(field => (fieldsToUpdate as any)[field]);
        
        await connection.query<ResultSetHeader>(
          `UPDATE trips SET ${setClause} WHERE id = ?`,
          [...values, id]
        );
      }
      
      // Update surcharge factors if provided
      if (trip.activeSurcharges !== undefined) {
        // Delete existing surcharge factors
        await connection.query('DELETE FROM trip_surcharges WHERE trip_id = ?', [id]);
        
        // Insert new surcharge factors if any
        if (trip.activeSurcharges.length > 0) {
          const values = trip.activeSurcharges.map(surchargeId => [id, surchargeId]);
          await connection.query(
            'INSERT INTO trip_surcharges (trip_id, surcharge_id) VALUES ?',
            [values]
          );
        }
      }
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async delete(id: number): Promise<boolean> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Delete trip surcharges
      await connection.query('DELETE FROM trip_surcharges WHERE trip_id = ?', [id]);
      
      // Delete trip discounts
      await connection.query('DELETE FROM trip_discounts WHERE trip_id = ?', [id]);
      
      // Delete trip
      const [result] = await connection.query<ResultSetHeader>(
        'DELETE FROM trips WHERE id = ?',
        [id]
      );
      
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

export default new TripModel();
