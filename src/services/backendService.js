import { supabaseService } from './supabase';

// Simple backend client for the local/Render Express API
const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

async function buildAuthHeaders(extra = {}) {
  const session = await supabaseService.getSession();
  const headers = { 'Content-Type': 'application/json', ...extra };
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  return headers;
}

export const backendService = {
  async health() {
    const res = await fetch(`${baseUrl}/health`);
    if (!res.ok) throw new Error('Backend health check failed');
    return res.json();
  },

  async getQuote({ distance = 0, duration = 0, surcharges = [], discounts = [] }) {
    const res = await fetch(`${baseUrl}/pricing/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ distance, duration, surcharges, discounts })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Backend quote failed (${res.status})`);
    }
    return res.json();
  },

  // ---------------------
  // Settings (company)
  // ---------------------
  async getSettings() {
    const res = await fetch(`${baseUrl}/settings`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Get settings failed (${res.status})`);
    }
    return res.json();
  },

  async updateSettings(updates) {
    const res = await fetch(`${baseUrl}/settings`, {
      method: 'PATCH',
      headers: await buildAuthHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Update settings failed (${res.status})`);
    }
    return res.json();
  },

  // ---------------------
  // Surcharge Factors
  // ---------------------
  async listSurchargeFactors() {
    const res = await fetch(`${baseUrl}/surcharge-factors`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Get surcharge factors failed (${res.status})`);
    }
    return res.json();
  },

  async createSurchargeFactor(data) {
    const res = await fetch(`${baseUrl}/surcharge-factors`, {
      method: 'POST',
      headers: await buildAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const e = new Error(err.error || `Create surcharge factor failed (${res.status})`);
      if (err.code) e.code = err.code;
      throw e;
    }
    return res.json();
  },

  async updateSurchargeFactor(id, data) {
    const res = await fetch(`${baseUrl}/surcharge-factors/${id}`, {
      method: 'PUT',
      headers: await buildAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Update surcharge factor failed (${res.status})`);
    }
    return res.json();
  },

  async deleteSurchargeFactor(id) {
    const res = await fetch(`${baseUrl}/surcharge-factors/${id}`, { method: 'DELETE', headers: await buildAuthHeaders({}) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Delete surcharge factor failed (${res.status})`);
    }
    return res.json();
  },

  // ---------------------
  // Discounts
  // ---------------------
  async listDiscounts() {
    const res = await fetch(`${baseUrl}/discounts`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Get discounts failed (${res.status})`);
    }
    return res.json();
  },

  async createDiscount(data) {
    const res = await fetch(`${baseUrl}/discounts`, {
      method: 'POST',
      headers: await buildAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const e = new Error(err.error || `Create discount failed (${res.status})`);
      if (err.code) e.code = err.code;
      throw e;
    }
    return res.json();
  },

  async updateDiscount(id, data) {
    const res = await fetch(`${baseUrl}/discounts/${id}`, {
      method: 'PUT',
      headers: await buildAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Update discount failed (${res.status})`);
    }
    return res.json();
  },

  async deleteDiscount(id) {
    const res = await fetch(`${baseUrl}/discounts/${id}`, { method: 'DELETE', headers: await buildAuthHeaders({}) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Delete discount failed (${res.status})`);
    }
    return res.json();
  },

  // ---------------------
  // Admin Users
  // ---------------------
  async listUsers() {
    const res = await fetch(`${baseUrl}/admin/users`, { headers: await buildAuthHeaders({}) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `List users failed (${res.status})`);
    }
    return res.json();
  },

  async createUser(data) {
    const res = await fetch(`${baseUrl}/admin/users`, {
      method: 'POST',
      headers: await buildAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Create user failed (${res.status})`);
    }
    return res.json();
  },

  async updateUser(id, data) {
    const res = await fetch(`${baseUrl}/admin/users/${id}`, {
      method: 'PATCH',
      headers: await buildAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Update user failed (${res.status})`);
    }
    return res.json();
  },

  async deleteUser(id) {
    const res = await fetch(`${baseUrl}/admin/users/${id}`, {
      method: 'DELETE',
      headers: await buildAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Delete user failed (${res.status})`);
    }
    return res.json();
  },

  // ---------------------
  // Trips (auth required)
  // ---------------------
  async getTrips(filters = {}) {
    const params = new URLSearchParams();
    const { status, dateFrom, dateTo, all, userId } = filters;
    if (status) params.set('status', status);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (all != null) params.set('all', String(all));
    if (userId) params.set('userId', userId);
    const url = `${baseUrl}/trips${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, { headers: await buildAuthHeaders({}) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Get trips failed (${res.status})`);
    }
    return res.json();
  },

  async getTripById(id) {
    const res = await fetch(`${baseUrl}/trips/${id}`, { headers: await buildAuthHeaders({}) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Get trip failed (${res.status})`);
    }
    return res.json();
  },

  async createTrip(tripData) {
    const res = await fetch(`${baseUrl}/trips`, {
      method: 'POST',
      headers: await buildAuthHeaders({}),
      body: JSON.stringify(tripData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Create trip failed (${res.status})`);
    }
    return res.json();
  },

  async updateTrip(id, updates) {
    const res = await fetch(`${baseUrl}/trips/${id}`, {
      method: 'PATCH',
      headers: await buildAuthHeaders({}),
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Update trip failed (${res.status})`);
    }
    return res.json();
  },

  async deleteTrip(id) {
    const res = await fetch(`${baseUrl}/trips/${id}`, { method: 'DELETE', headers: await buildAuthHeaders({}) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Delete trip failed (${res.status})`);
    }
    return res.json();
  },

  async addTripSurcharge(tripId, surchargeId, amount) {
    const res = await fetch(`${baseUrl}/trips/${tripId}/surcharges`, {
      method: 'POST',
      headers: await buildAuthHeaders({}),
      body: JSON.stringify({ surcharge_id: surchargeId, amount })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Add trip surcharge failed (${res.status})`);
    }
    return res.json();
  },

  async removeTripSurcharge(tripId, surchargeId) {
    const res = await fetch(`${baseUrl}/trips/${tripId}/surcharges/${surchargeId}`, {
      method: 'DELETE',
      headers: await buildAuthHeaders({})
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Remove trip surcharge failed (${res.status})`);
    }
    return res.json();
  },

  async addTripDiscount(tripId, discountId, amount) {
    const res = await fetch(`${baseUrl}/trips/${tripId}/discounts`, {
      method: 'POST',
      headers: await buildAuthHeaders({}),
      body: JSON.stringify({ discount_id: discountId, amount })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Add trip discount failed (${res.status})`);
    }
    return res.json();
  },

  async removeTripDiscount(tripId, discountId) {
    const res = await fetch(`${baseUrl}/trips/${tripId}/discounts/${discountId}`, {
      method: 'DELETE',
      headers: await buildAuthHeaders({})
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Remove trip discount failed (${res.status})`);
    }
    return res.json();
  },

  // ---------------------
  // Orders (auth required)
  // ---------------------
  async getOrders(filters = {}) {
    const f = filters && filters.filters ? { ...(filters.filters || {}) } : { ...(filters || {}) };
    const params = new URLSearchParams();
    const { status, orderNumber, all, userId } = {
      status: f.status,
      orderNumber: f.orderNumber,
      all: f.all,
      userId: f.userId ?? f.user_id
    };
    if (status) params.set('status', status);
    if (orderNumber) params.set('orderNumber', orderNumber);
    if (all != null) params.set('all', String(all));
    if (userId) params.set('userId', userId);
    const url = `${baseUrl}/orders${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, { headers: await buildAuthHeaders({}) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Get orders failed (${res.status})`);
    }
    return res.json();
  },

  async getOrderById(id) {
    const res = await fetch(`${baseUrl}/orders/${id}`, { headers: await buildAuthHeaders({}) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Get order failed (${res.status})`);
    }
    return res.json();
  },

  async createOrder(orderData) {
    const res = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: await buildAuthHeaders({}),
      body: JSON.stringify(orderData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Create order failed (${res.status})`);
    }
    return res.json();
  },

  async updateOrder(id, updates) {
    const res = await fetch(`${baseUrl}/orders/${id}`, {
      method: 'PATCH',
      headers: await buildAuthHeaders({}),
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Update order failed (${res.status})`);
    }
    return res.json();
  },

  async deleteOrder(id) {
    const res = await fetch(`${baseUrl}/orders/${id}`, { method: 'DELETE', headers: await buildAuthHeaders({}) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Delete order failed (${res.status})`);
    }
    return res.json();
  },

  async getOrderItems(orderId) {
    const res = await fetch(`${baseUrl}/orders/${orderId}/items`, { headers: await buildAuthHeaders({}) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Get order items failed (${res.status})`);
    }
    return res.json();
  },

  async createOrderItem(orderId, itemData) {
    const res = await fetch(`${baseUrl}/orders/${orderId}/items`, {
      method: 'POST',
      headers: await buildAuthHeaders({}),
      body: JSON.stringify(itemData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Create order item failed (${res.status})`);
    }
    return res.json();
  },

  async deleteOrderItem(orderId, itemId) {
    const res = await fetch(`${baseUrl}/orders/${orderId}/items/${itemId}`, { method: 'DELETE', headers: await buildAuthHeaders({}) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Delete order item failed (${res.status})`);
    }
    return res.json();
  },

  // ---------------------
  // Invoices (auth required)
  // ---------------------
  async getInvoices(filters = {}) {
    const params = new URLSearchParams();
    const { status, overdue, orderId, invoiceNumber, all, userId } = filters;
    if (status) params.set('status', status);
    if (overdue != null) params.set('overdue', String(overdue));
    if (orderId) params.set('orderId', orderId);
    if (invoiceNumber) params.set('invoiceNumber', invoiceNumber);
    if (all != null) params.set('all', String(all));
    if (userId) params.set('userId', userId);
    const url = `${baseUrl}/invoices${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, { headers: await buildAuthHeaders({}) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Get invoices failed (${res.status})`);
    }
    return res.json();
  },

  async getInvoiceById(id) {
    const res = await fetch(`${baseUrl}/invoices/${id}`, { headers: await buildAuthHeaders({}) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Get invoice failed (${res.status})`);
    }
    return res.json();
  },

  async createInvoice(invoiceData) {
    const res = await fetch(`${baseUrl}/invoices`, {
      method: 'POST',
      headers: await buildAuthHeaders({}),
      body: JSON.stringify(invoiceData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Create invoice failed (${res.status})`);
    }
    return res.json();
  },

  async updateInvoice(id, invoiceData) {
    const res = await fetch(`${baseUrl}/invoices/${id}`, {
      method: 'PATCH',
      headers: await buildAuthHeaders({}),
      body: JSON.stringify(invoiceData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Update invoice failed (${res.status})`);
    }
    return res.json();
  },

  async deleteInvoice(id) {
    const res = await fetch(`${baseUrl}/invoices/${id}`, { method: 'DELETE', headers: await buildAuthHeaders({}) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Delete invoice failed (${res.status})`);
    }
    return res.json();
  }
};
