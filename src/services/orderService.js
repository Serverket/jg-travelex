import { backendService } from './backendService';

/**
 * Order service
 */
export const orderService = {
  /**
   * Get all orders
   * @returns {Promise<Array>} - List of orders
   */
  async getAllOrders() {
    return await backendService.getOrders({ all: true });
  },

  /**
   * Get orders by user ID
   * @param {number} userId - User ID
   * @returns {Promise<Array>} - List of user orders
   */
  async getOrders(filters = {}) {
    return await backendService.getOrders(filters);
  },

  /**
   * Get orders by user ID (helper wrapper)
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - List of user orders
   */
  async getOrdersByUserId(userId) {
    return await backendService.getOrders({ userId });
  },

  /**
   * Get order by ID
   * @param {number} id - Order ID
   * @returns {Promise<object>} - Order data
   */
  async getOrderById(id) {
    return await backendService.getOrderById(id);
  },

  /**
   * Create order
   * @param {object} orderData - Order data
   * @returns {Promise<object>} - Created order response
   */
  async createOrder(orderData) {
    return await backendService.createOrder(orderData);
  },

  /**
   * Create order item
   * @param {object} itemData - { order_id, trip_id, amount }
   * @returns {Promise<object>} - Created order_item row
   */
  async createOrderItem(itemData) {
    const { order_id, ...rest } = itemData || {};
    if (!order_id) throw new Error('order_id is required to create an order item');
    return await backendService.createOrderItem(order_id, rest);
  },

  /**
   * Get order items by order ID
   * @param {string} orderId - Order ID
   * @returns {Promise<Array>} - List of order items
   */
  async getOrderItems(orderId) {
    return await backendService.getOrderItems(orderId);
  },

  /**
   * Update order
   * @param {number} id - Order ID
   * @param {object} updates - Updated order data
   * @returns {Promise<object>} - Update response
   */
  async updateOrder(id, updates) {
    return await backendService.updateOrder(id, updates);
  },

  /**
   * Delete order
   * @param {number} id - Order ID
   * @returns {Promise<object>} - Delete response
   */
  async deleteOrder(id) {
    return await backendService.deleteOrder(id);
  }
};
