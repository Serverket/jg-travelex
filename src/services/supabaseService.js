import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to hash passwords (same as backend)
const hashPassword = (password) => {
  return crypto.SHA256(password).toString();
};

export const supabaseService = {
  // Health check
  async checkHealth() {
    try {
      const { data, error } = await supabase.from('settings').select('id').limit(1);
      if (error) throw error;
      return {
        status: 'ok',
        message: 'Supabase connected',
        database: 'Supabase PostgreSQL',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  },

  // Authentication
  async login(username, password) {
    try {
      const hashedPassword = hashPassword(password);
      
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', hashedPassword)
        .single();

      if (error || !user) {
        throw new Error('Invalid credentials');
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      return {
        message: 'Login successful',
        user: userWithoutPassword
      };
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  },

  // Users
  async getUsers() {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data;
  },

  async createUser(userData) {
    if (userData.password) {
      userData.password = hashPassword(userData.password);
    }
    const { data, error } = await supabase.from('users').insert(userData).select();
    if (error) throw error;
    return data[0];
  },

  // Settings
  async getSettings() {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) throw error;
    return data;
  },

  async updateSettings(settingsData) {
    const { data, error } = await supabase
      .from('settings')
      .update(settingsData)
      .eq('id', settingsData.id)
      .select();
    if (error) throw error;
    return data[0];
  },

  // Trips
  async getTrips() {
    const { data, error } = await supabase.from('trips').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createTrip(tripData) {
    const { data, error } = await supabase.from('trips').insert(tripData).select();
    if (error) throw error;
    return data[0];
  },

  async deleteTrip(id) {
    const { error } = await supabase.from('trips').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  // Orders
  async getOrders() {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createOrder(orderData) {
    const { data, error } = await supabase.from('orders').insert(orderData).select();
    if (error) throw error;
    return data[0];
  },

  // Invoices
  async getInvoices() {
    const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createInvoice(invoiceData) {
    const { data, error } = await supabase.from('invoices').insert(invoiceData).select();
    if (error) throw error;
    return data[0];
  },

  // Surcharge Factors
  async getSurchargeFactors() {
    const { data, error } = await supabase.from('surcharge_factors').select('*');
    if (error) throw error;
    return data;
  },

  async createSurchargeFactor(factorData) {
    const { data, error } = await supabase.from('surcharge_factors').insert(factorData).select();
    if (error) throw error;
    return data[0];
  },

  async updateSurchargeFactor(id, factorData) {
    const { data, error } = await supabase
      .from('surcharge_factors')
      .update(factorData)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },

  async deleteSurchargeFactor(id) {
    const { error } = await supabase.from('surcharge_factors').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  // Discounts
  async getDiscounts() {
    const { data, error } = await supabase.from('discounts').select('*');
    if (error) throw error;
    return data;
  },

  async getDiscountById(id) {
    const { data, error } = await supabase.from('discounts').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async createDiscount(discountData) {
    const { data, error } = await supabase.from('discounts').insert(discountData).select();
    if (error) throw error;
    return data[0];
  },

  async updateDiscount(id, discountData) {
    const { data, error } = await supabase
      .from('discounts')
      .update(discountData)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },

  async deleteDiscount(id) {
    const { error } = await supabase.from('discounts').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  // Additional methods needed by service files
  async getTripById(id) {
    const { data, error } = await supabase.from('trips').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async getTripsByUserId(userId) {
    const { data, error } = await supabase.from('trips').select('*').eq('user_id', userId);
    if (error) throw error;
    return data;
  },

  async updateTrip(id, tripData) {
    const { data, error } = await supabase
      .from('trips')
      .update(tripData)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },

  async getOrderById(id) {
    const { data, error } = await supabase.from('orders').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async getOrdersByUserId(userId) {
    const { data, error } = await supabase.from('orders').select('*').eq('user_id', userId);
    if (error) throw error;
    return data;
  },

  async updateOrder(id, orderData) {
    const { data, error } = await supabase
      .from('orders')
      .update(orderData)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },

  async deleteOrder(id) {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  async getInvoiceById(id) {
    const { data, error } = await supabase.from('invoices').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async getInvoiceByNumber(invoiceNumber) {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('invoice_number', invoiceNumber)
      .single();
    if (error) throw error;
    return data;
  },

  async getInvoiceByOrderId(orderId) {
    const { data, error } = await supabase.from('invoices').select('*').eq('order_id', orderId);
    if (error) throw error;
    return data;
  },

  async updateInvoice(id, invoiceData) {
    const { data, error } = await supabase
      .from('invoices')
      .update(invoiceData)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },

  async getSurchargeFactorById(id) {
    const { data, error } = await supabase
      .from('surcharge_factors')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }
};
