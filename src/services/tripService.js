import { supabaseService } from './supabase';

/**
 * Trip service
 */
export const tripService = {
  /**
   * Get all trips
   * @returns {Promise<Array>} - List of trips
   */
  async getTrips(filters = {}) {
    return await supabaseService.getTrips(filters);
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
   * @param {object} updates - Updated trip data
   * @returns {Promise<object>} - Update response
   */
  async updateTrip(id, updates) {
    return await supabaseService.updateTrip(id, updates);
  },

  /**
   * Delete trip
   * @param {number} id - Trip ID
   * @returns {Promise<object>} - Delete response
   */
  async deleteTrip(id) {
    return await supabaseService.deleteTrip(id);
  },

  // Trip surcharges and discounts
  async addSurcharge(tripId, surchargeId, amount) {
    return await supabaseService.addTripSurcharge(tripId, surchargeId, amount);
  },

  async removeSurcharge(tripId, surchargeId) {
    return await supabaseService.removeTripSurcharge(tripId, surchargeId);
  },

  async addDiscount(tripId, discountId, amount) {
    return await supabaseService.addTripDiscount(tripId, discountId, amount);
  },

  async removeDiscount(tripId, discountId) {
    return await supabaseService.removeTripDiscount(tripId, discountId);
  }
};
