import { apiService } from './apiService';

/**
 * Settings service
 */
export const settingsService = {
  /**
   * Get global settings
   * @returns {Promise<object>} - Settings data
   */
  async getSettings() {
    return await apiService.get('/settings');
  },

  /**
   * Update global settings
   * @param {object} settings - Settings data to update
   * @returns {Promise<object>} - Updated settings data
   */
  async updateSettings(settings) {
    return await apiService.put('/settings', settings);
  },
  
  /**
   * Get all surcharge factors
   * @returns {Promise<Array>} - List of surcharge factors
   */
  async getSurchargeFactors() {
    return await apiService.get('/surcharge-factors');
  },
  
  /**
   * Get surcharge factor by ID
   * @param {number} id - Surcharge factor ID
   * @returns {Promise<object>} - Surcharge factor data
   */
  async getSurchargeFactorById(id) {
    return await apiService.get(`/surcharge-factors/${id}`);
  },
  
  /**
   * Create surcharge factor
   * @param {object} surchargeData - Surcharge factor data
   * @returns {Promise<object>} - Created surcharge factor
   */
  async createSurchargeFactor(surchargeData) {
    return await apiService.post('/surcharge-factors', surchargeData);
  },
  
  /**
   * Update surcharge factor
   * @param {number} id - Surcharge factor ID
   * @param {object} surchargeData - Updated surcharge factor data
   * @returns {Promise<object>} - Updated surcharge factor
   */
  async updateSurchargeFactor(id, surchargeData) {
    return await apiService.put(`/surcharge-factors/${id}`, surchargeData);
  },
  
  /**
   * Delete surcharge factor
   * @param {number} id - Surcharge factor ID
   * @returns {Promise<object>} - Result
   */
  async deleteSurchargeFactor(id) {
    return await apiService.delete(`/surcharge-factors/${id}`);
  },
  
  /**
   * Get all discounts
   * @returns {Promise<Array>} - List of discounts
   */
  async getDiscounts() {
    return await apiService.get('/discounts');
  },
  
  /**
   * Get discount by ID
   * @param {number} id - Discount ID
   * @returns {Promise<object>} - Discount data
   */
  async getDiscountById(id) {
    return await apiService.get(`/discounts/${id}`);
  },
  
  /**
   * Create discount
   * @param {object} discountData - Discount data
   * @returns {Promise<object>} - Created discount
   */
  async createDiscount(discountData) {
    return await apiService.post('/discounts', discountData);
  },
  
  /**
   * Update discount
   * @param {number} id - Discount ID
   * @param {object} discountData - Updated discount data
   * @returns {Promise<object>} - Updated discount
   */
  async updateDiscount(id, discountData) {
    return await apiService.put(`/discounts/${id}`, discountData);
  },
  
  /**
   * Delete discount
   * @param {number} id - Discount ID
   * @returns {Promise<object>} - Result
   */
  async deleteDiscount(id) {
    return await apiService.delete(`/discounts/${id}`);
  }
};
