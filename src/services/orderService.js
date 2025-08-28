import { supabaseService } from './supabase';

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
  async getOrders(filters = {}) {
    return await supabaseService.getOrders(filters);
  },

  /**
   * Get orders by user ID (helper wrapper)
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - List of user orders
   */
  async getOrdersByUserId(userId) {
    return await supabaseService.getOrders({ userId });
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
   * Create order item
   * @param {object} itemData - { order_id, trip_id, amount }
   * @returns {Promise<object>} - Created order_item row
   */
  async createOrderItem(itemData) {
    return await supabaseService.createOrderItem(itemData);
  },

  /**
   * Get order items by order ID
   * @param {string} orderId - Order ID
   * @returns {Promise<Array>} - List of order items
   */
  async getOrderItems(orderId) {
    return await supabaseService.getOrderItems(orderId);
  },

  /**
   * Update order
   * @param {number} id - Order ID
   * @param {object} updates - Updated order data
   * @returns {Promise<object>} - Update response
   */
  async updateOrder(id, updates) {
    return await supabaseService.updateOrder(id, updates);
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
