import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const supabaseService = {
  // Health Check
  async checkHealth() {
    try {
      const { data: _data, error } = await supabase.from('company_settings').select('id').limit(1);
      return {
        healthy: !error,
        message: error ? error.message : 'Supabase connection successful',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  },

  // Authentication using Supabase Auth
  async signUp(email, password, metadata = {}) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Sign up failed: ${error.message}`);
    }
  },

  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      // Get user profile
      if (data.user) {
        const profile = await this.getProfile(data.user.id);
        return {
          ...data,
          profile
        };
      }
      
      return data;
    } catch (error) {
      throw new Error(`Sign in failed: ${error.message}`);
    }
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      throw new Error(`Sign out failed: ${error.message}`);
    }
  },

  async getSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      throw new Error(`Get session failed: ${error.message}`);
    }
  },

  async getUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      throw new Error(`Get user failed: ${error.message}`);
    }
  },

  // Profiles
  async getProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Get profile failed: ${error.message}`);
    }
  },

  async updateProfile(userId, updates) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Update profile failed: ${error.message}`);
    }
  },

  async getAllProfiles() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Get profiles failed: ${error.message}`);
    }
  },

  // Company Settings
  async getCompanySettings() {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', '11111111-1111-1111-1111-111111111111')
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Get settings failed: ${error.message}`);
    }
  },

  async updateCompanySettings(settings) {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .update(settings)
        .eq('id', '11111111-1111-1111-1111-111111111111')
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Update settings failed: ${error.message}`);
    }
  },

  // Trips
  async getTrips(filters = {}) {
    try {
      let query = supabase
        .from('trips')
        .select(`
          *,
          profiles!trips_user_id_fkey (
            id,
            full_name,
            email
          ),
          trip_surcharges (
            *,
            surcharge_factors (*)
          ),
          trip_discounts (
            *,
            discounts (*)
          )
        `)
        .order('trip_date', { ascending: false });

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.dateFrom) {
        query = query.gte('trip_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('trip_date', filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Get trips failed: ${error.message}`);
    }
  },

  async getTripById(id) {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          profiles!trips_user_id_fkey (
            id,
            full_name,
            email
          ),
          trip_surcharges (
            *,
            surcharge_factors (*)
          ),
          trip_discounts (
            *,
            discounts (*)
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Get trip failed: ${error.message}`);
    }
  },

  async createTrip(tripData) {
    try {
      const tripNumber = `TRIP-${Date.now()}`;
      
      const { data, error } = await supabase
        .from('trips')
        .insert({ ...tripData, trip_number: tripNumber })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Create trip failed: ${error.message}`);
    }
  },

  async updateTrip(id, updates) {
    try {
      const { data, error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Update trip failed: ${error.message}`);
    }
  },

  async deleteTrip(id) {
    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      throw new Error(`Delete trip failed: ${error.message}`);
    }
  },

  // Orders
  async getOrders(filters = {}) {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          profiles!orders_user_id_fkey (
            id,
            full_name,
            email
          ),
          order_items (
            *,
            trips (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Get orders failed: ${error.message}`);
    }
  },

  async getOrderById(id) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles!orders_user_id_fkey (
            id,
            full_name,
            email
          ),
          order_items (
            *,
            trips (*)
          ),
          invoices (*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Get order failed: ${error.message}`);
    }
  },

  async createOrder(orderData) {
    try {
      const orderNumber = `ORD-${Date.now()}`;
      
      const { data, error } = await supabase
        .from('orders')
        .insert({ ...orderData, order_number: orderNumber })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Create order failed: ${error.message}`);
    }
  },

  async updateOrder(id, updates) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Update order failed: ${error.message}`);
    }
  },

  async deleteOrder(id) {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      throw new Error(`Delete order failed: ${error.message}`);
    }
  },

  // Order Items
  async createOrderItem(itemData) {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .insert(itemData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Create order item failed: ${error.message}`);
    }
  },

  async getOrderItems(orderId) {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          trips (*)
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Get order items failed: ${error.message}`);
    }
  },

  // Invoices
  async getInvoices(filters = {}) {
    try {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          orders (
            *,
            profiles!orders_user_id_fkey (
              id,
              full_name,
              email
            ),
            order_items (
              *,
              trips (*)
            )
          )
        `)
        .order('invoice_date', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.overdue) {
        query = query.lt('due_date', new Date().toISOString());
        query = query.in('status', ['pending', 'partial']);
      }
      if (filters.orderId) {
        query = query.eq('order_id', filters.orderId);
      }
      if (filters.invoiceNumber) {
        query = query.eq('invoice_number', filters.invoiceNumber);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Get invoices failed: ${error.message}`);
    }
  },

  async getInvoiceById(id) {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          orders (
            *,
            profiles!orders_user_id_fkey (
              id,
              full_name,
              email
            ),
            order_items (
              *,
              trips (*)
            )
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Get invoice failed: ${error.message}`);
    }
  },

  async createInvoice(invoiceData) {
    try {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const invoiceNumber = `INV-${year}${month}-${Date.now().toString().slice(-6)}`;
      
      const { data, error } = await supabase
        .from('invoices')
        .insert({ ...invoiceData, invoice_number: invoiceNumber })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Create invoice failed: ${error.message}`);
    }
  },

  async updateInvoice(id, updates) {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Update invoice failed: ${error.message}`);
    }
  },

  // Surcharge Factors
  async getSurchargeFactors(activeOnly = false) {
    try {
      let query = supabase
        .from('surcharge_factors')
        .select('*')
        .order('name', { ascending: true });
      
      if (activeOnly) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Get surcharges failed: ${error.message}`);
    }
  },

  async createSurcharge(surchargeData) {
    try {
      const { data, error } = await supabase
        .from('surcharge_factors')
        .insert(surchargeData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Create surcharge failed: ${error.message}`);
    }
  },

  async updateSurcharge(id, updates) {
    try {
      const { data, error } = await supabase
        .from('surcharge_factors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Update surcharge failed: ${error.message}`);
    }
  },

  async deleteSurcharge(id) {
    try {
      const { error } = await supabase
        .from('surcharge_factors')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      throw new Error(`Delete surcharge failed: ${error.message}`);
    }
  },

  // Provide factor-style aliases and getters expected by settingsService
  async getSurchargeFactorById(id) {
    try {
      const { data, error } = await supabase
        .from('surcharge_factors')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Get surcharge factor failed: ${error.message}`);
    }
  },

  async createSurchargeFactor(factorData) {
    return await this.createSurcharge(factorData);
  },

  async updateSurchargeFactor(id, updates) {
    return await this.updateSurcharge(id, updates);
  },

  async deleteSurchargeFactor(id) {
    return await this.deleteSurcharge(id);
  },

  // Discounts
  async getDiscounts(activeOnly = false) {
    try {
      let query = supabase
        .from('discounts')
        .select('*')
        .order('name', { ascending: true });
      
      if (activeOnly) {
        query = query.eq('is_active', true);
        query = query.or('valid_until.is.null,valid_until.gte.' + new Date().toISOString());
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Get discounts failed: ${error.message}`);
    }
  },

  async getDiscountById(id) {
    try {
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Get discount failed: ${error.message}`);
    }
  },

  async createDiscount(discountData) {
    try {
      const { data, error } = await supabase
        .from('discounts')
        .insert(discountData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Create discount failed: ${error.message}`);
    }
  },

  async updateDiscount(id, updates) {
    try {
      const { data, error } = await supabase
        .from('discounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Update discount failed: ${error.message}`);
    }
  },

  async deleteDiscount(id) {
    try {
      const { error } = await supabase
        .from('discounts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      throw new Error(`Delete discount failed: ${error.message}`);
    }
  },

  // Trip Surcharges
  async addTripSurcharge(tripId, surchargeId, amount) {
    try {
      const { data, error } = await supabase
        .from('trip_surcharges')
        .insert({ trip_id: tripId, surcharge_id: surchargeId, amount })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Add trip surcharge failed: ${error.message}`);
    }
  },

  async removeTripSurcharge(tripId, surchargeId) {
    try {
      const { error } = await supabase
        .from('trip_surcharges')
        .delete()
        .eq('trip_id', tripId)
        .eq('surcharge_id', surchargeId);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      throw new Error(`Remove trip surcharge failed: ${error.message}`);
    }
  },

  // Trip Discounts
  async addTripDiscount(tripId, discountId, amount) {
    try {
      const { data, error } = await supabase
        .from('trip_discounts')
        .insert({ trip_id: tripId, discount_id: discountId, amount })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Add trip discount failed: ${error.message}`);
    }
  },

  async removeTripDiscount(tripId, discountId) {
    try {
      const { error } = await supabase
        .from('trip_discounts')
        .delete()
        .eq('trip_id', tripId)
        .eq('discount_id', discountId);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      throw new Error(`Remove trip discount failed: ${error.message}`);
    }
  },

  // Audit Logs
  async createAuditLog(logData) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert(logData);
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Audit log failed:', error);
    }
  },

  async getAuditLogs(filters = {}) {
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          profiles!audit_logs_user_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }
      if (filters.entityId) {
        query = query.eq('entity_id', filters.entityId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Get audit logs failed: ${error.message}`);
    }
  }
};
