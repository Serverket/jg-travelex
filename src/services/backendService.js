// Simple backend client for the local/Render Express API
const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

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
  }
};
