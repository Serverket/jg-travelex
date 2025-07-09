import { apiService } from './apiService';

/**
 * Invoice service
 */
export const invoiceService = {
  /**
   * Get all invoices
   * @returns {Promise<Array>} - List of invoices
   */
  async getAllInvoices() {
    return await apiService.get('/invoices');
  },

  /**
   * Get invoice by ID
   * @param {number} id - Invoice ID
   * @returns {Promise<object>} - Invoice data
   */
  async getInvoiceById(id) {
    return await apiService.get(`/invoices/${id}`);
  },
  
  /**
   * Get invoice by order ID
   * @param {number} orderId - Order ID
   * @returns {Promise<object>} - Invoice data
   */
  async getInvoiceByOrderId(orderId) {
    return await apiService.get(`/invoices/order/${orderId}`);
  },
  
  /**
   * Get invoice by invoice number
   * @param {string} invoiceNumber - Invoice number
   * @returns {Promise<object>} - Invoice data
   */
  async getInvoiceByNumber(invoiceNumber) {
    return await apiService.get(`/invoices/number/${invoiceNumber}`);
  },

  /**
   * Create invoice
   * @param {object} invoiceData - Invoice data
   * @returns {Promise<object>} - Created invoice response
   */
  async createInvoice(invoiceData) {
    return await apiService.post('/invoices', invoiceData);
  },

  /**
   * Update invoice
   * @param {number} id - Invoice ID
   * @param {object} invoiceData - Updated invoice data
   * @returns {Promise<object>} - Update response
   */
  async updateInvoice(id, invoiceData) {
    return await apiService.put(`/invoices/${id}`, invoiceData);
  },

  /**
   * Delete invoice
   * @param {number} id - Invoice ID
   * @returns {Promise<object>} - Delete response
   */
  async deleteInvoice(id) {
    return await apiService.delete(`/invoices/${id}`);
  }
};
