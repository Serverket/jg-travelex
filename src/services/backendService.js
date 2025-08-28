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
  }
};
