import { supabaseService } from './supabaseService';

/**
 * Order service
 */
export const orderService = {
  /**
   * Get all orders
   * @returns {Promise<Array>} - List of orders
   */
  async getAllOrders() {
    return await supabaseService.getOrders();
  },

  /**
   * Get orders by user ID
   * @param {number} userId - User ID
   * @returns {Promise<Array>} - List of user orders
   */
  async getOrdersByUserId(userId) {
    return await supabaseService.getOrdersByUserId(userId);
  },

  /**
   * Get order by ID
   * @param {number} id - Order ID
   * @returns {Promise<object>} - Order data
   */
  async getOrderById(id) {
    return await supabaseService.getOrderById(id);
  },

  /**
   * Create order
   * @param {object} orderData - Order data
   * @returns {Promise<object>} - Created order response
   */
  async createOrder(orderData) {
    return await supabaseService.createOrder(orderData);
  },

  /**
   * Update order
   * @param {number} id - Order ID
   * @param {object} orderData - Updated order data
   * @returns {Promise<object>} - Update response
   */
  async updateOrder(id, orderData) {
    return await supabaseService.updateOrder(id, orderData);
  },

  /**
   * Delete order
   * @param {number} id - Order ID
   * @returns {Promise<object>} - Delete response
   */
  async deleteOrder(id) {
    return await supabaseService.deleteOrder(id);
  }
};
