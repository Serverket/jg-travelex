// import fetch from 'node-fetch'; // Native fetch in Node 18+

const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const forecastCache = new Map();

/**
 * Clean up expired cache entries.
 */
function cleanCache() {
    const now = Date.now();
    for (const [key, { timestamp }] of forecastCache.entries()) {
        if (now - timestamp > CACHE_DURATION_MS) {
            forecastCache.delete(key);
        }
    }
}

setInterval(cleanCache, 60 * 60 * 1000);

export const weatherService = {
    /**
     * Get combined forecast.
     * Returns English/Standard strings to be translated on the client.
     */
    async getForecast(lat, lng, date) {
        const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)},${date || 'current'}`;
        const cached = forecastCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CACHE_DURATION_MS)) {
            return cached.data;
        }

        try {
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

    async fetchOpenMeteo(lat, lng) {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=14`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Open-Meteo Error: ${res.statusText}`);
            return await res.json();
        } catch (e) {
            console.error('Open-Meteo fetch failed:', e.message);
            return null;
        }
    },

    async fetchWeatherApi(lat, lng, date) {
        const apiKey = process.env.WEATHER_API_KEY;
        if (!apiKey) return null;

        try {
            // Removed lang=es to keep API response standard/fast
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

    assessWeather(omData, waData, targetDate) {
        let isHazardous = false;
        let hazardDetails = [];
        let summary = 'Unknown';
        let temperature = null;

        let omIndex = -1;
        if (omData && omData.daily && omData.daily.time && targetDate) {
            omIndex = omData.daily.time.findIndex(d => d === targetDate);
        }

        // Open-Meteo Data
        if (omData) {
            if (omIndex >= 0) {
                const daily = omData.daily;
                const code = daily.weather_code[omIndex];
                const maxTemp = daily.temperature_2m_max[omIndex];
                const windMax = daily.wind_speed_10m_max[omIndex];
                const precipSum = daily.precipitation_sum[omIndex];

                temperature = maxTemp;
                summary = this.getWmoDescription(code);

                if (code >= 95) {
                    isHazardous = true;
                    hazardDetails.push('Thunderstorms expected');
                }
                if (windMax > 60) {
                    isHazardous = true;
                    hazardDetails.push(`High winds forecast (${windMax} km/h)`);
                }
                if (precipSum > 20) {
                    isHazardous = true;
                    hazardDetails.push(`Heavy rain expected (${precipSum}mm)`);
                }

            } else if (!targetDate) {
                const current = omData.current;
                temperature = current.temperature_2m;
                summary = this.getWmoDescription(current.weather_code);

                if (current.weather_code >= 95) {
                    isHazardous = true;
                    hazardDetails.push('Thunderstorm detected');
                }
                if (current.wind_speed_10m > 60) {
                    isHazardous = true;
                    hazardDetails.push(`High winds (${current.wind_speed_10m} km/h)`);
                }
                if (current.precipitation > 5) {
                    isHazardous = true;
                    hazardDetails.push('Heavy precipitation');
                }
            } else {
                summary = 'Forecast not available for this date';
            }
        }

        // WeatherAPI Data (Alerts)
        if (waData) {
            if (waData.alerts && waData.alerts.alert && waData.alerts.alert.length > 0) {
                const alerts = waData.alerts.alert;
                alerts.forEach(alert => {
                    isHazardous = true;
                    // Note: Alerts are official text, often hard to translate dynamically without API support, 
                    // but we keep them raw here as requested for stability.
                    hazardDetails.push(`Alert: ${alert.event}`);
                });
            }

            if (summary === 'Unknown' || summary === 'Forecast not available for this date') {
                if (waData.forecast && waData.forecast.forecastday && waData.forecast.forecastday.length > 0) {
                    const day = waData.forecast.forecastday[0].day;
                    temperature = day.avgtemp_c;
                    summary = day.condition.text;

                    if (day.maxwind_kph > 60) {
                        isHazardous = true;
                        hazardDetails.push(`High winds (${day.maxwind_kph} km/h)`);
                    }
                } else if (waData.current && !targetDate) {
                    temperature = waData.current.temp_c;
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
