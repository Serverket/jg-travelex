import { backendService } from './backendService';

export const weatherService = {
    /**
     * Get forecast for a specific location
     * @param {number} lat
     * @param {number} lng
     * @param {string} [date] - Standard ISO date string (YYYY-MM-DD)
     */
    async getForecast(lat, lng, date) {
        try {
            const { data, error } = await backendService.invokeFunction(`weather?lat=${lat}&lng=${lng}${date ? `&date=${date}` : ''}`);
            if (!error && data && (data.summary || data.temperature !== undefined)) {
                return data;
            }
        } catch (e) {
            console.warn('Weather Edge Function unavailable, using Open-Meteo fallback:', e.message);
        }

        // Direct Open-Meteo public API fallback
        try {
            const omRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`);
            const omData = await omRes.json();
            const temp = omData?.current?.temperature_2m ?? 72;
            const wind = omData?.current?.wind_speed_10m ?? 5;
            const isHazardous = wind > 40 || temp <= 32;

            return {
                isHazardous,
                hazardDetails: isHazardous ? [`Condiciones adversas (${temp}°F, viento ${wind}mph)`] : [],
                summary: `Pronóstico disponible (${temp}°F)`,
                temperature: temp,
                targetDate: date || new Date().toISOString().split('T')[0],
                timestamp: new Date().toISOString()
            };
        } catch (omErr) {
            return {
                isHazardous: false,
                hazardDetails: [],
                summary: 'Datos de clima no disponibles',
                temperature: 70,
                targetDate: date || new Date().toISOString().split('T')[0],
                timestamp: new Date().toISOString()
            };
        }
    }
};
