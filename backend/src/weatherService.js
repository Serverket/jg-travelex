/**
 * Weather Service
 * 
 * Provides weather forecasting with hazard assessment for trip planning.
 * Integrates data from Open-Meteo and WeatherAPI.com.
 * 
 * IMPORTANT: All responses are in English for API stability.
 * Translation to Spanish happens on the frontend.
 * 
 * Units: Fahrenheit, MPH, Inches
 */

const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const forecastCache = new Map();

/**
 * Hazard Classification Thresholds
 */
const HAZARD_THRESHOLDS = {
    WIND_MPH: 40,              // > 40 mph is hazardous
    PRECIP_DAILY_INCH: 0.8,    // > 0.8 inches/day is heavy
    PRECIP_HOURLY_INCH: 0.2,   // > 0.2 inches/hour is heavy
    PRECIP_HOURLY_INCH: 0.2,   // > 0.2 inches/hour is heavy
    FREEZING_TEMP_F: 32,       // <= 32°F is hazardous
    EXTREME_COLD_F: 10,        // <= 10°F is extreme
};

/**
 * WMO Weather Code Categories
 * Based on World Meteorological Organization standard codes
 */
const WMO_HAZARD_CODES = {
    // Severe Conditions
    THUNDERSTORM: [95, 96, 99],        // Thunderstorms (always hazardous)
    HEAVY_RAIN: [65, 82],              // Heavy/violent rain
    HEAVY_SNOW: [75, 77, 86],          // Heavy snow fall and showers
    DENSE_DRIZZLE: [55],               // Dense drizzle (poor visibility)

    // Visibility Hazards
    FOG: [45, 48],                     // Fog and freezing fog (dangerous for driving)

    // Moderate Conditions (hazardous for travel)
    MODERATE_RAIN: [63, 81],           // Moderate rain and showers
    MODERATE_SNOW: [73, 85],           // Moderate snow fall and showers
};

/**
 * Clean up expired cache entries
 */
function cleanCache() {
    const now = Date.now();
    for (const [key, { timestamp }] of forecastCache.entries()) {
        if (now - timestamp > CACHE_DURATION_MS) {
            forecastCache.delete(key);
        }
    }
}

// Run cache cleanup every hour
setInterval(cleanCache, 60 * 60 * 1000);

export const weatherService = {
    /**
     * Get combined weather forecast with hazard assessment
     * 
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {string} date - Target date (YYYY-MM-DD) or null for current
     * @returns {Promise<Object>} Weather assessment with hazard flags
     */
    async getForecast(lat, lng, date) {
        const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)},${date || 'current'}`;
        const cached = forecastCache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp < CACHE_DURATION_MS)) {
            return cached.data;
        }

        try {
            // Fetch from both providers in parallel
            const results = await Promise.allSettled([
                this.fetchOpenMeteo(lat, lng),
                this.fetchWeatherApi(lat, lng, date)
            ]);

            const openMeteoData = results[0].status === 'fulfilled' ? results[0].value : null;
            const weatherApiData = results[1].status === 'fulfilled' ? results[1].value : null;

            if (!openMeteoData && !weatherApiData) {
                throw new Error('All weather providers failed');
            }

            const assessment = this.assessWeather(openMeteoData, weatherApiData, date);

            forecastCache.set(cacheKey, {
                timestamp: Date.now(),
                data: assessment
            });

            return assessment;

        } catch (error) {
            console.error('Weather service error:', error);
            throw error;
        }
    },

    /**
     * Fetch forecast from Open-Meteo API
     * Units: Fahrenheit, MPH, Inches
     */
    async fetchOpenMeteo(lat, lng) {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=14&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`;
            const res = await fetch(url);

            if (!res.ok) throw new Error(`Open-Meteo Error: ${res.statusText}`);
            return await res.json();
        } catch (e) {
            console.error('Open-Meteo fetch failed:', e.message);
            return null;
        }
    },

    /**
     * Fetch forecast from WeatherAPI.com
     * Includes official weather alerts
     */
    async fetchWeatherApi(lat, lng, date) {
        const apiKey = process.env.WEATHER_API_KEY;
        if (!apiKey) return null;

        try {
            let url = `http://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${lat},${lng}&days=1&alerts=yes&aqi=no`;
            if (date) {
                url += `&dt=${date}`;
            }

            const res = await fetch(url);
            if (!res.ok) throw new Error(`WeatherAPI Error: ${res.statusText}`);
            return await res.json();
        } catch (e) {
            console.error('WeatherAPI fetch failed:', e.message);
            return null;
        }
    },

    /**
     * Assess weather conditions and classify hazards
     * 
     * @param {Object} omData - Open-Meteo data
     * @param {Object} waData - WeatherAPI data
     * @param {string} targetDate - Target date (YYYY-MM-DD)
     * @returns {Object} Weather assessment with hazard classification
     */
    assessWeather(omData, waData, targetDate) {
        let isHazardous = false;
        let hazardDetails = [];
        let summary = 'Unknown';
        let temperature = null;

        // Find target date index in Open-Meteo daily data
        let omIndex = -1;
        if (omData && omData.daily && omData.daily.time && targetDate) {
            omIndex = omData.daily.time.findIndex(d => d === targetDate);
        }

        // === Process Open-Meteo Data ===
        if (omData) {
            if (omIndex >= 0) {
                // Daily forecast for specific date
                const daily = omData.daily;
                const code = daily.weather_code[omIndex];
                const maxTemp = daily.temperature_2m_max[omIndex];
                const windMax = daily.wind_speed_10m_max[omIndex];
                const precipSum = daily.precipitation_sum[omIndex];

                temperature = maxTemp;
                summary = this.getWmoDescription(code);

                // Check WMO code-based hazards
                if (WMO_HAZARD_CODES.THUNDERSTORM.includes(code)) {
                    isHazardous = true;
                    hazardDetails.push('Thunderstorms expected');
                }
                if (WMO_HAZARD_CODES.HEAVY_RAIN.includes(code)) {
                    isHazardous = true;
                    hazardDetails.push('Heavy rain expected');
                }
                if (WMO_HAZARD_CODES.HEAVY_SNOW.includes(code)) {
                    isHazardous = true;
                    hazardDetails.push('Heavy snow expected');
                }
                if (WMO_HAZARD_CODES.DENSE_DRIZZLE.includes(code)) {
                    isHazardous = true;
                    hazardDetails.push('Dense drizzle expected');
                }
                if (WMO_HAZARD_CODES.FOG.includes(code)) {
                    isHazardous = true;
                    hazardDetails.push('Fog expected');
                }
                if (WMO_HAZARD_CODES.MODERATE_RAIN.includes(code)) {
                    isHazardous = true;
                    hazardDetails.push('Moderate rain expected');
                }
                if (WMO_HAZARD_CODES.MODERATE_SNOW.includes(code)) {
                    isHazardous = true;
                    hazardDetails.push('Moderate snow expected');
                }

                // Check metric-based hazards
                if (windMax > HAZARD_THRESHOLDS.WIND_MPH) {
                    isHazardous = true;
                    hazardDetails.push(`High winds forecast (${windMax} mph)`);
                }
                if (precipSum > HAZARD_THRESHOLDS.PRECIP_DAILY_INCH) {
                    isHazardous = true;
                    hazardDetails.push(`Heavy precipitation expected (${precipSum} in)`);
                }

                // Check for freezing conditions with precipitation
                if (maxTemp <= HAZARD_THRESHOLDS.FREEZING_TEMP_F && precipSum > 0) {
                    isHazardous = true;
                    hazardDetails.push('Freezing conditions with precipitation');
                } else if (maxTemp <= HAZARD_THRESHOLDS.FREEZING_TEMP_F) {
                    isHazardous = true;
                    hazardDetails.push('Freezing temperatures');
                }

            } else if (!targetDate) {
                // Current conditions
                const current = omData.current;
                temperature = current.temperature_2m;
                summary = this.getWmoDescription(current.weather_code);

                // Check WMO code-based hazards
                if (WMO_HAZARD_CODES.THUNDERSTORM.includes(current.weather_code)) {
                    isHazardous = true;
                    hazardDetails.push('Thunderstorm detected');
                }
                if (WMO_HAZARD_CODES.HEAVY_RAIN.includes(current.weather_code)) {
                    isHazardous = true;
                    hazardDetails.push('Heavy rain detected');
                }
                if (WMO_HAZARD_CODES.HEAVY_SNOW.includes(current.weather_code)) {
                    isHazardous = true;
                    hazardDetails.push('Heavy snow detected');
                }
                if (WMO_HAZARD_CODES.DENSE_DRIZZLE.includes(current.weather_code)) {
                    isHazardous = true;
                    hazardDetails.push('Dense drizzle detected');
                }
                if (WMO_HAZARD_CODES.FOG.includes(current.weather_code)) {
                    isHazardous = true;
                    hazardDetails.push('Fog detected');
                }
                if (WMO_HAZARD_CODES.MODERATE_RAIN.includes(current.weather_code)) {
                    isHazardous = true;
                    hazardDetails.push('Moderate rain detected');
                }
                if (WMO_HAZARD_CODES.MODERATE_SNOW.includes(current.weather_code)) {
                    isHazardous = true;
                    hazardDetails.push('Moderate snow detected');
                }

                // Check metric-based hazards
                if (current.wind_speed_10m > HAZARD_THRESHOLDS.WIND_MPH) {
                    isHazardous = true;
                    hazardDetails.push(`High winds (${current.wind_speed_10m} mph)`);
                }
                if (current.precipitation > HAZARD_THRESHOLDS.PRECIP_HOURLY_INCH) {
                    isHazardous = true;
                    hazardDetails.push('Heavy precipitation');
                }

                // Check for freezing conditions with precipitation
                if (current.temperature_2m <= HAZARD_THRESHOLDS.FREEZING_TEMP_F && current.precipitation > 0) {
                    isHazardous = true;
                    hazardDetails.push('Freezing conditions with precipitation');
                } else if (current.temperature_2m <= HAZARD_THRESHOLDS.FREEZING_TEMP_F) {
                    isHazardous = true;
                    hazardDetails.push('Freezing temperatures');
                }
            } else {
                summary = 'Forecast not available for this date';
            }
        }

        // === Process WeatherAPI Data ===
        if (waData) {
            // Check for official weather alerts
            if (waData.alerts && waData.alerts.alert && waData.alerts.alert.length > 0) {
                const alerts = waData.alerts.alert;
                alerts.forEach(alert => {
                    isHazardous = true;
                    hazardDetails.push(`Alert: ${alert.event}`);
                });
            }

            // Use WeatherAPI as fallback if Open-Meteo data unavailable
            if (summary === 'Unknown' || summary === 'Forecast not available for this date') {
                if (waData.forecast && waData.forecast.forecastday && waData.forecast.forecastday.length > 0) {
                    const day = waData.forecast.forecastday[0].day;
                    temperature = day.avgtemp_f;
                    summary = day.condition.text;

                    if (day.maxwind_mph > HAZARD_THRESHOLDS.WIND_MPH) {
                        isHazardous = true;
                        hazardDetails.push(`High winds (${day.maxwind_mph} mph)`);
                    }
                } else if (waData.current && !targetDate) {
                    temperature = waData.current.temp_f;
                    summary = waData.current.condition.text;
                }
            }
        }

        return {
            isHazardous,
            hazardDetails,
            summary,
            temperature,
            targetDate: targetDate || new Date().toISOString().split('T')[0],
            source: { openMeteo: !!omData, weatherApi: !!waData },
            timestamp: new Date().toISOString()
        };
    },

    /**
     * Get human-readable description for WMO weather code
     * 
     * @param {number} code - WMO weather code
     * @returns {string} Weather description in English
     */
    getWmoDescription(code) {
        const codes = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Fog',
            48: 'Depositing rime fog',
            51: 'Light drizzle',
            53: 'Moderate drizzle',
            55: 'Dense drizzle',
            61: 'Slight rain',
            63: 'Moderate rain',
            65: 'Heavy rain',
            71: 'Slight snow fall',
            73: 'Moderate snow fall',
            75: 'Heavy snow fall',
            77: 'Snow grains',
            80: 'Slight rain showers',
            81: 'Moderate rain showers',
            82: 'Violent rain showers',
            85: 'Slight snow showers',
            86: 'Heavy snow showers',
            95: 'Thunderstorm',
            96: 'Thunderstorm with slight hail',
            99: 'Thunderstorm with heavy hail'
        };
        return codes[code] || 'Unknown weather';
    }
};
