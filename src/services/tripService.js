import { backendService } from './backendService';

/**
 * Trip service
 */
export const tripService = {
  /**
   * Get all trips
   * @returns {Promise<Array>} - List of trips
   */
  async getTrips(filters = {}) {
    return await backendService.getTrips(filters);
  },

  /**
   * Get trips by user ID
   * @param {number} userId - User ID
   * @returns {Promise<Array>} - List of user trips
   */
  async getTripsByUserId(userId) {
    return await backendService.getTrips({ userId });
  },

  /**
   * Get trip by ID
   * @param {number} id - Trip ID
   * @returns {Promise<object>} - Trip data
   */
  async getTripById(id) {
    return await backendService.getTripById(id);
  },

  /**
   * Create trip
   * @param {object} tripData - Trip data
   * @returns {Promise<object>} - Created trip response
   */
  async createTrip(tripData) {
    return await backendService.createTrip(tripData);
  },

  /**
   * Update trip
   * @param {number} id - Trip ID
   * @param {object} updates - Updated trip data
   * @returns {Promise<object>} - Update response
   */
  async updateTrip(id, updates) {
    return await backendService.updateTrip(id, updates);
  },

  /**
   * Delete trip
   * @param {number} id - Trip ID
   * @returns {Promise<object>} - Delete response
   */
  async deleteTrip(id) {
    return await backendService.deleteTrip(id);
  },

  // Trip surcharges and discounts
  async addSurcharge(tripId, surchargeId, amount) {
    return await backendService.addTripSurcharge(tripId, surchargeId, amount);
  },

  async removeSurcharge(tripId, surchargeId) {
    return await backendService.removeTripSurcharge(tripId, surchargeId);
  },

  async addDiscount(tripId, discountId, amount) {
    return await backendService.addTripDiscount(tripId, discountId, amount);
  },

  async removeDiscount(tripId, discountId) {
    return await backendService.removeTripDiscount(tripId, discountId);
  }
};
