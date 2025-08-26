import supabase from '../config/db';

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
      const { data: trips, error } = await supabase
        .from('trips')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Fetch surcharge factors for each trip
      for (const trip of trips || []) {
        const { data: surcharges, error: surchargeError } = await supabase
          .from('trip_surcharges')
          .select('surcharge_id')
          .eq('trip_id', trip.id);
        
        if (surchargeError) {
          console.error('Error fetching surcharges:', surchargeError);
          trip.activeSurcharges = [];
        } else {
          trip.activeSurcharges = surcharges?.map((s: any) => s.surcharge_id) || [];
        }
      }
      
      return trips || [];
    } catch (error) {
      throw error;
    }
  }
  
  async findByUserId(userId: number): Promise<Trip[]> {
    try {
      const { data: trips, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Fetch surcharge factors for each trip
      for (const trip of trips || []) {
        const { data: surcharges, error: surchargeError } = await supabase
          .from('trip_surcharges')
          .select('surcharge_id')
          .eq('trip_id', trip.id);
        
        if (surchargeError) {
          console.error('Error fetching surcharges:', surchargeError);
          trip.activeSurcharges = [];
        } else {
          trip.activeSurcharges = surcharges?.map((s: any) => s.surcharge_id) || [];
        }
      }
      
      return trips || [];
    } catch (error) {
      throw error;
    }
  }

  async findById(id: number): Promise<Trip | null> {
    try {
      const { data: trip, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      
      // Fetch surcharge factors
      const { data: surcharges, error: surchargeError } = await supabase
        .from('trip_surcharges')
        .select('surcharge_id')
        .eq('trip_id', trip.id);
      
      if (surchargeError) {
        console.error('Error fetching surcharges:', surchargeError);
        trip.activeSurcharges = [];
      } else {
        trip.activeSurcharges = surcharges?.map((s: any) => s.surcharge_id) || [];
      }
      
      return trip;
    } catch (error) {
      throw error;
    }
  }

  async create(trip: Trip): Promise<number> {
    try {
      console.log('Creating trip with data:', trip);
      
      // Insert trip
      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: trip.user_id,
          origin: trip.origin,
          destination: trip.destination,
          distance: trip.distance,
          duration: trip.duration,
          date: trip.date,
          price: trip.price
        })
        .select('id')
        .single();
      
      if (error) throw error;
      
      const tripId = data.id;
      console.log(`Trip created successfully with ID: ${tripId}`);
      
      // Safely handle the activeSurcharges array
      const surcharges = Array.isArray(trip.activeSurcharges) ? 
        trip.activeSurcharges.filter(id => typeof id === 'number' && !isNaN(id)) : [];
      
      console.log('Filtered surcharges to insert:', surcharges);
      
      // Insert surcharge factors if any
      if (surcharges.length > 0) {
        try {
          const surchargeInserts = surcharges.map(surchargeId => ({
            trip_id: tripId,
            surcharge_id: surchargeId
          }));
          
          const { error: surchargeError } = await supabase
            .from('trip_surcharges')
            .insert(surchargeInserts);
          
          if (surchargeError) {
            console.error('Error inserting surcharges:', surchargeError);
          } else {
            console.log(`Added ${surcharges.length} surcharges to trip ${tripId}`);
          }
        } catch (surchargeError) {
          console.error('Error inserting surcharges:', surchargeError);
        }
      }
      
      return tripId;
    } catch (error) {
      console.error('Error in trip creation:', error);
      throw error;
    }
  }

  async update(id: number, trip: Partial<Trip>): Promise<boolean> {
    try {
      // Update trip fields
      const fieldsToUpdate = {...trip};
      delete fieldsToUpdate.id;
      delete fieldsToUpdate.created_at;
      delete fieldsToUpdate.updated_at;
      delete fieldsToUpdate.activeSurcharges;
      
      // Only update if there are fields to update
      const fields = Object.keys(fieldsToUpdate);
      if (fields.length > 0) {
        const { error } = await supabase
          .from('trips')
          .update(fieldsToUpdate)
          .eq('id', id);
        
        if (error) throw error;
      }
      
      // Update surcharge factors if provided
      if (trip.activeSurcharges !== undefined) {
        // Delete existing surcharge factors
        const { error: deleteError } = await supabase
          .from('trip_surcharges')
          .delete()
          .eq('trip_id', id);
        
        if (deleteError) throw deleteError;
        
        // Insert new surcharge factors if any
        if (trip.activeSurcharges.length > 0) {
          const surchargeInserts = trip.activeSurcharges.map(surchargeId => ({
            trip_id: id,
            surcharge_id: surchargeId
          }));
          
          const { error: insertError } = await supabase
            .from('trip_surcharges')
            .insert(surchargeInserts);
          
          if (insertError) throw insertError;
        }
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      // Delete trip surcharges
      const { error: surchargeError } = await supabase
        .from('trip_surcharges')
        .delete()
        .eq('trip_id', id);
      
      if (surchargeError) throw surchargeError;
      
      // Delete trip discounts
      const { error: discountError } = await supabase
        .from('trip_discounts')
        .delete()
        .eq('trip_id', id);
      
      if (discountError) throw discountError;
      
      // Delete trip
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  }
}

export default new TripModel();
