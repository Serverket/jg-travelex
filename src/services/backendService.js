import { supabaseService, supabase } from './supabase';

export const backendService = {
  async health() {
    try {
      const res = await supabaseService.checkHealth();
      return { ok: res?.healthy ?? true, status: 'connected' };
    } catch {
      return { ok: false, status: 'disconnected' };
    }
  },

  async invokeFunction(name, options) {
    return await supabase.functions.invoke(name, options);
  },

  createChannel(name) {
    return supabase.channel(name);
  },

  removeChannel(channel) {
    return supabase.removeChannel(channel);
  },

  async rpc(fnName, params) {
    return await supabase.rpc(fnName, params);
  },

  async resetApiUsageLogs(service) {
    const { error } = await supabase
      .from('api_usage_logs')
      .delete()
      .eq('service', service);
    if (error) throw error;
    return { success: true };
  },

  // ---------------------
  // Auth passthroughs
  // ---------------------
  async signIn(email, password) {
    return await supabaseService.signIn(email, password);
  },

  async signUp(email, password, metadata) {
    return await supabaseService.signUp(email, password, metadata);
  },

  async signOut() {
    return await supabaseService.signOut();
  },

  async getSession() {
    return await supabaseService.getSession();
  },

  async getUser() {
    return await supabaseService.getUser();
  },

  async getProfile(userId) {
    return await supabaseService.getProfile(userId);
  },

  async updateProfile(id, updates) {
    return await supabaseService.updateProfile(id, updates);
  },

  async getAllProfiles() {
    return await supabaseService.getAllProfiles();
  },

  async getQuote({ distance = 0, duration = 0, surcharges = [], discounts = [] }) {
    try {
      const { data, error } = await supabase.functions.invoke('pricing-quote', {
        body: { distance, duration, surcharges, discounts }
      });
      if (!error && data && data.price !== undefined) {
        return data;
      }
    } catch (err) {
      console.warn('Edge Function pricing-quote unavailable, executing client fallback:', err.message);
    }

    // Client-side fallback calculation using Supabase database settings
    try {
      const settings = await supabaseService.getCompanySettings();
      const distRate = Number(settings?.distance_rate ?? 1.50);
      const durRate = Number(settings?.duration_rate ?? 15.00);

      let basePrice = (Number(distance) * distRate) + (Number(duration) * durRate);
      const breakdown = { base: basePrice, surcharges: [], discounts: [] };

      if (surcharges.length) {
        const allSurcharges = await supabaseService.getSurchargeFactors();
        const active = allSurcharges.filter(s => surcharges.includes(s.id));
        active.forEach(s => {
          const amt = s.type === 'percentage' ? basePrice * (Number(s.rate) / 100) : Number(s.rate);
          basePrice += amt;
          breakdown.surcharges.push({ id: s.id, name: s.name, amount: amt });
        });
      }

      if (discounts.length) {
        const allDiscounts = await supabaseService.getDiscounts();
        const active = allDiscounts.filter(d => discounts.includes(d.id));
        active.forEach(d => {
          const amt = d.type === 'percentage' ? basePrice * (Number(d.rate) / 100) : Number(d.rate);
          basePrice -= amt;
          breakdown.discounts.push({ id: d.id, name: d.name, amount: amt });
        });
      }

      const price = Number(Math.max(0, basePrice)).toFixed(2);
      return { price, breakdown };
    } catch (fallbackErr) {
      throw new Error(`Quote calculation failed: ${fallbackErr.message}`);
    }
  },

  // ---------------------
  // Settings (company)
  // ---------------------
  async getSettings() {
    return await supabaseService.getCompanySettings();
  },

  async updateSettings(updates) {
    return await supabaseService.updateCompanySettings(updates);
  },

  // ---------------------
  // Surcharge Factors
  // ---------------------
  async listSurchargeFactors() {
    return await supabaseService.getSurchargeFactors();
  },

  async createSurchargeFactor(data) {
    const res = await supabaseService.createSurchargeFactor(data);
    return { ...res, surchargeFactorId: res.id };
  },

  async updateSurchargeFactor(id, data) {
    return await supabaseService.updateSurchargeFactor(id, data);
  },

  async deleteSurchargeFactor(id) {
    return await supabaseService.deleteSurchargeFactor(id);
  },

  // ---------------------
  // Discounts
  // ---------------------
  async listDiscounts() {
    return await supabaseService.getDiscounts();
  },

  async createDiscount(data) {
    const res = await supabaseService.createDiscount(data);
    return { ...res, discountId: res.id };
  },

  async updateDiscount(id, data) {
    return await supabaseService.updateDiscount(id, data);
  },

  async deleteDiscount(id) {
    return await supabaseService.deleteDiscount(id);
  },

  // ---------------------
  // Admin User Management
  // ---------------------
  async listUsers() {
    return await supabaseService.getAllProfiles();
  },

  async createUser(userData) {
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'create', ...userData }
      });
      if (!error && data) return data;
    } catch (err) {
      console.warn('Edge Function admin-users unavailable, falling back to direct DB profile update:', err.message);
    }

    // Direct DB fallback for profile creation/updating
    return await supabaseService.updateProfile(userData.id || Date.now().toString(), userData);
  },

  async updateUser(id, userData) {
    let updateResult = null;
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'update', id, ...userData }
      });
      if (!error && data) updateResult = data;
    } catch (err) {
      console.warn('Edge Function admin-users unavailable, falling back to direct DB update:', err.message);
    }

    if (!updateResult) {
      updateResult = await supabaseService.updateProfile(id, userData);
    }

    // Always fetch the complete profile to ensure all fields are present
    // The edge function or fallback may return partial data
    try {
      const fullProfile = await supabaseService.getProfile(id);
      if (fullProfile) return fullProfile;
    } catch (fetchErr) {
      console.warn('Could not fetch full profile after update, returning update result:', fetchErr.message);
    }

    return updateResult;
  },

  async deleteUser(id) {
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'delete', id }
      });
      if (!error && data) return data;
    } catch (err) {
      console.warn('Edge Function admin-users unavailable, falling back to direct DB delete:', err.message);
    }

    return await supabaseService.deleteProfile(id);
  },

  // ---------------------
  // Trips CRUD
  // ---------------------
  async getTrips(filters = {}) {
    return await supabaseService.getTrips(filters);
  },

  async getTripById(id) {
    return await supabaseService.getTripById(id);
  },

  async createTrip(tripData) {
    const res = await supabaseService.createTrip(tripData);
    return { ...res, tripId: res.id };
  },

  async updateTrip(id, updates) {
    return await supabaseService.updateTrip(id, updates);
  },

  async deleteTrip(id) {
    return await supabaseService.deleteTrip(id);
  },

  async addTripSurcharge(tripId, surchargeId, amount) {
    return await supabaseService.addTripSurcharge(tripId, surchargeId, amount);
  },

  async removeTripSurcharge(tripId, surchargeId) {
    return await supabaseService.removeTripSurcharge(tripId, surchargeId);
  },

  async addTripDiscount(tripId, discountId, amount) {
    return await supabaseService.addTripDiscount(tripId, discountId, amount);
  },

  async removeTripDiscount(tripId, discountId) {
    return await supabaseService.removeTripDiscount(tripId, discountId);
  },

  // ---------------------
  // Orders CRUD
  // ---------------------
  async getOrders(filters = {}) {
    return await supabaseService.getOrders(filters);
  },

  async getOrderById(id) {
    return await supabaseService.getOrderById(id);
  },

  async createOrder(orderData) {
    const data = await supabaseService.createOrder(orderData);
    return {
      ...data,
      orderId: data.id,
      orderNumber: data.order_number
    };
  },

  async updateOrder(id, updates) {
    return await supabaseService.updateOrder(id, updates);
  },

  async deleteOrder(id) {
    return await supabaseService.deleteOrder(id);
  },

  async getOrderItems(orderId) {
    return await supabaseService.getOrderItems(orderId);
  },

  async createOrderItem(orderId, itemData) {
    return await supabaseService.createOrderItem({ ...itemData, order_id: orderId });
  },

  async deleteOrderItem(orderId, itemId) {
    return await supabaseService.deleteOrderItem(itemId);
  },

  // ---------------------
  // Invoices CRUD
  // ---------------------
  async getInvoices(filters = {}) {
    return await supabaseService.getInvoices(filters);
  },

  async getInvoiceById(id) {
    return await supabaseService.getInvoiceById(id);
  },

  async createInvoice(invoiceData) {
    const data = await supabaseService.createInvoice(invoiceData);
    return {
      ...data,
      invoiceId: data.id,
      invoiceNumber: data.invoice_number
    };
  },

  async updateInvoice(id, updates) {
    return await supabaseService.updateInvoice(id, updates);
  },

  async deleteInvoice(id) {
    return await supabaseService.deleteInvoice(id);
  }
};
