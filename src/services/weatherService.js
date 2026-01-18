const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export const weatherService = {
    /**
     * Get forecast for a specific location
     * @param {number} lat
     * @param {number} lng
     * @param {string} [date] - Standard ISO date string (YYYY-MM-DD)
     */
    async getForecast(lat, lng, date) {
        const params = new URLSearchParams({
            lat: lat.toString(),
            lng: lng.toString()
        });

        if (date) {
            params.append('date', date);
        }

        const res = await fetch(`${baseUrl}/weather?${params.toString()}`);

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Weather forecast failed (${res.status})`);
        }

        return res.json();
    }
};
