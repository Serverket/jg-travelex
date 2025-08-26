import { supabaseService } from './supabaseService';

/**
 * Trip service
 */
export const tripService = {
  /**
   * Get all trips
   * @returns {Promise<Array>} - List of trips
   */
  async getTrips() {
    return await supabaseService.getTrips();
  },

  /**
   * Get trips by user ID
   * @param {number} userId - User ID
   * @returns {Promise<Array>} - List of user trips
   */
  async getTripsByUserId(userId) {
    return await supabaseService.getTripsByUserId(userId);
  },

  /**
   * Get trip by ID
   * @param {number} id - Trip ID
   * @returns {Promise<object>} - Trip data
   */
  async getTripById(id) {
    return await supabaseService.getTripById(id);
  },

  /**
   * Create trip
   * @param {object} tripData - Trip data
   * @returns {Promise<object>} - Created trip response
   */
  async createTrip(tripData) {
    return await supabaseService.createTrip(tripData);
  },

  /**
   * Update trip
   * @param {number} id - Trip ID
   * @param {object} tripData - Updated trip data
   * @returns {Promise<object>} - Update response
   */
  async updateTrip(id, tripData) {
    return await supabaseService.updateTrip(id, tripData);
  },

  /**
   * Delete trip
   * @param {number} id - Trip ID
   * @returns {Promise<object>} - Delete response
   */
  async deleteTrip(id) {
    return await supabaseService.deleteTrip(id);
  }
};
