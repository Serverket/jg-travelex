import { backendService } from './backendService';

/**
 * Invoice service
 */
export const invoiceService = {
  /**
   * Get all invoices
   * @param {object} filters - Filters for invoices
   * @returns {Promise<Array>} - List of invoices
   */
  async getInvoices(filters = {}) {
    return await backendService.getInvoices(filters);
  },

  /**
   * Get all invoices (alias without filters)
   * @returns {Promise<Array>} - List of all invoices
   */
  async getAllInvoices() {
    return await backendService.getInvoices();
  },

  /**
   * Get invoice by ID
   * @param {number} id - Invoice ID
   * @returns {Promise<object>} - Invoice data
   */
  async getInvoiceById(id) {
    return await backendService.getInvoiceById(id);
  },
  
  /**
   * Get invoice by order ID
   * @param {number} orderId - Order ID
   * @returns {Promise<object>} - Invoice data
   */
  async getInvoiceByOrderId(orderId) {
    const list = await backendService.getInvoices({ orderId });
    if (list && list.length > 0) return list[0];
    throw new Error('Error 404: Invoice not found');
  },
  
  /**
   * Get invoice by invoice number
   * @param {string} invoiceNumber - Invoice number
   * @returns {Promise<object>} - Invoice data
   */
  async getInvoiceByNumber(invoiceNumber) {
    const list = await backendService.getInvoices({ invoiceNumber });
    if (list && list.length > 0) return list[0];
    throw new Error('Error 404: Invoice not found');
  },

  /**
   * Create invoice
   * @param {object} invoiceData - Invoice data
   * @returns {Promise<object>} - Created invoice response
   */
  async createInvoice(invoiceData) {
    return await backendService.createInvoice(invoiceData);
  },

  /**
   * Update invoice
   * @param {number} id - Invoice ID
   * @param {object} invoiceData - Updated invoice data
   * @returns {Promise<object>} - Update response
   */
  async updateInvoice(id, invoiceData) {
    return await backendService.updateInvoice(id, invoiceData);
  },

  /**
   * Delete invoice
   * @param {number} id - Invoice ID
   * @returns {Promise<object>} - Delete response
   */
  async deleteInvoice(id) {
    return await backendService.deleteInvoice(id);
  }
};
