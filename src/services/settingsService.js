import { supabaseService } from './supabase';

/**
 * Settings service
 */
export const settingsService = {
  /**
   * Get global settings
   * @returns {Promise<object>} - Settings data
   */
  async getSettings() {
    return await supabaseService.getCompanySettings();
  },

  /**
   * Update global settings
   * @param {object} updates - Settings data to update
   * @returns {Promise<object>} - Updated settings data
   */
  async updateSettings(updates) {
    return await supabaseService.updateCompanySettings(updates);
  },
  
  /**
   * Get all surcharge factors
   * @returns {Promise<Array>} - List of surcharge factors
   */
  async getSurchargeFactors() {
    return await supabaseService.getSurchargeFactors();
  },
  
  /**
   * Get surcharge factor by ID
   * @param {number} id - Surcharge factor ID
   * @returns {Promise<object>} - Surcharge factor data
   */
  async getSurchargeFactorById(id) {
    return await supabaseService.getSurchargeFactorById(id);
  },
  
  /**
   * Create surcharge factor
   * @param {object} factorData - Surcharge factor data
   * @returns {Promise<object>} - Created surcharge factor
   */
  async createSurchargeFactor(factorData) {
    return await supabaseService.createSurchargeFactor(factorData);
  },
  
  /**
   * Update surcharge factor
   * @param {number} id - Surcharge factor ID
   * @param {object} factorData - Updated surcharge factor data
   * @returns {Promise<object>} - Updated surcharge factor
   */
  async updateSurchargeFactor(id, factorData) {
    return await supabaseService.updateSurchargeFactor(id, factorData);
  },
  
  /**
   * Delete surcharge factor
   * @param {number} id - Surcharge factor ID
   * @returns {Promise<object>} - Result
   */
  async deleteSurchargeFactor(id) {
    return await supabaseService.deleteSurchargeFactor(id);
  },
  
  /**
   * Get all discounts
   * @returns {Promise<Array>} - List of discounts
   */
  async getDiscounts() {
    return await supabaseService.getDiscounts();
  },
  
  /**
   * Get discount by ID
   * @param {number} id - Discount ID
   * @returns {Promise<object>} - Discount data
   */
  async getDiscountById(id) {
    return await supabaseService.getDiscountById(id);
  },
  
  /**
   * Create discount
   * @param {object} discountData - Discount data
   * @returns {Promise<object>} - Created discount
   */
  async createDiscount(discountData) {
    return await supabaseService.createDiscount(discountData);
  },
  
  /**
   * Update discount
   * @param {number} id - Discount ID
   * @param {object} discountData - Updated discount data
   * @returns {Promise<object>} - Updated discount
   */
  async updateDiscount(id, discountData) {
    return await supabaseService.updateDiscount(id, discountData);
  },
  
  /**
   * Delete discount
   * @param {number} id - Discount ID
   * @returns {Promise<object>} - Result
   */
  async deleteDiscount(id) {
    return await supabaseService.deleteDiscount(id);
  }
};
