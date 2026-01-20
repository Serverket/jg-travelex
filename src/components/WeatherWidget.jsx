/**
 * Weather Widget Component
 * 
 * Displays weather forecast with hazard alerts for trip destinations.
 * 
 * Features:
 * - Dual temperature display (Fahrenheit primary, Celsius secondary)
 * - Hazard classification with visual alerts
 * - Spanish UI with English backend queries
 * - Real-time weather updates
 * 
 * @param {Object} destination - Destination with lat/lng coordinates
 * @param {string} date - Target date (YYYY-MM-DD) or null for current
 */

import { useState, useEffect } from 'react';
import { weatherService } from '../services/weatherService';

/**
 * Translation Dictionary (English → Spanish)
 * Backend returns English for API stability, frontend translates for UX
 */
const TRANSLATIONS = {
    // === WMO Weather Codes ===
    'Clear sky': 'Cielo despejado',
    'Mainly clear': 'Mayormente despejado',
    'Partly cloudy': 'Parcialmente nublado',
    'Overcast': 'Nublado',
    'Fog': 'Niebla',
    'Depositing rime fog': 'Niebla con escarcha',
    'Light drizzle': 'Llovizna ligera',
    'Moderate drizzle': 'Llovizna moderada',
    'Dense drizzle': 'Llovizna densa',
    'Slight rain': 'Lluvia ligera',
    'Moderate rain': 'Lluvia moderada',
    'Heavy rain': 'Lluvia fuerte',
    'Slight snow fall': 'Nevada ligera',
    'Moderate snow fall': 'Nevada moderada',
    'Heavy snow fall': 'Nevada fuerte',
    'Snow grains': 'Granizo menudo',
    'Slight rain showers': 'Chubascos ligeros',
    'Moderate rain showers': 'Chubascos moderados',
    'Violent rain showers': 'Chubascos violentos',
    'Slight snow showers': 'Chubascos de nieve ligeros',
    'Heavy snow showers': 'Chubascos de nieve fuertes',
    'Thunderstorm': 'Tormenta eléctrica',
    'Thunderstorm with slight hail': 'Tormenta con granizo ligero',
    'Thunderstorm with heavy hail': 'Tormenta con granizo fuerte',
    'Unknown weather': 'Clima desconocido',
    'Forecast not available for this date': 'Pronóstico no disponible para esta fecha',

    // === Hazard Messages ===
    'Thunderstorms expected': 'Se esperan tormentas eléctricas',
    'Thunderstorm detected': 'Tormenta eléctrica detectada',
    'High winds forecast': 'Vientos fuertes pronosticados',
    'High winds': 'Vientos fuertes',
    'Heavy rain expected': 'Lluvia intensa esperada',
    'Heavy rain detected': 'Lluvia intensa detectada',
    'Heavy precipitation': 'Precipitación intensa',
    'Heavy precipitation expected': 'Precipitación intensa esperada',
    'Heavy snow expected': 'Nevada intensa esperada',
    'Heavy snow detected': 'Nevada intensa detectada',
    'Dense drizzle expected': 'Llovizna densa esperada',
    'Dense drizzle detected': 'Llovizna densa detectada',
    'Fog expected': 'Niebla esperada',
    'Fog detected': 'Niebla detectada',
    'Moderate rain expected': 'Lluvia moderada esperada',
    'Moderate rain detected': 'Lluvia moderada detectada',
    'Moderate snow expected': 'Nevada moderada esperada',
    'Moderate snow detected': 'Nevada moderada detectada',
    'Freezing conditions with precipitation': 'Condiciones de congelación con precipitación',
    'Freezing temperatures': 'Temperaturas bajo cero',
};

/**
 * Translate text from English to Spanish
 * Handles both direct translations and dynamic strings with values
 * Adds metric equivalents for imperial units (mph → km/h)
 * 
 * @param {string} text - English text to translate
 * @returns {string} Translated Spanish text with metric equivalents
 */
const translateText = (text) => {
    if (!text) return '';

    // Direct translation lookup
    if (TRANSLATIONS[text]) return TRANSLATIONS[text];

    // Handle wind speed warnings with mph → km/h conversion
    // Example: "High winds (45 mph)" → "Vientos fuertes (45 mph / 72 km/h)"
    if (text.includes('High winds')) {
        const mphMatch = text.match(/(\d+(?:\.\d+)?)\s*mph/);
        if (mphMatch) {
            const mph = parseFloat(mphMatch[1]);
            const kmh = Math.round(mph * 1.60934);
            return text
                .replace('High winds', 'Vientos fuertes')
                .replace('forecast', 'pronosticados')
                .replace(/(\d+(?:\.\d+)?)\s*mph/, `$1 mph / ${kmh} km/h`);
        }
        return text.replace('High winds', 'Vientos fuertes').replace('forecast', 'pronosticados');
    }

    // Handle precipitation warnings with inch → cm conversion
    // Example: "Heavy precipitation expected (2.5 in)" → "Precipitación intensa esperada (2.5 in / 6.4 cm)"
    if (text.includes('Heavy precipitation')) {
        const inchMatch = text.match(/(\d+(?:\.\d+)?)\s*in/);
        if (inchMatch) {
            const inches = parseFloat(inchMatch[1]);
            const cm = (inches * 2.54).toFixed(1);
            return text
                .replace('Heavy precipitation', 'Precipitación intensa')
                .replace('expected', 'esperada')
                .replace(/(\d+(?:\.\d+)?)\s*in/, `$1 in / ${cm} cm`);
        }
        return text.replace('Heavy precipitation', 'Precipitación intensa').replace('expected', 'esperada');
    }

    if (text.includes('Heavy rain')) {
        return text.replace('Heavy rain', 'Lluvia intensa').replace('expected', 'esperada');
    }
    if (text.includes('Heavy snow')) {
        return text.replace('Heavy snow', 'Nevada intensa').replace('expected', 'esperada').replace('detected', 'detectada');
    }

    // Handle official weather alerts (keep original text, translate prefix)
    if (text.startsWith('Alert:')) {
        return text.replace('Alert:', 'Alerta Oficial:');
    }

    // Fallback to original if no translation found
    return text;
};

const WeatherWidget = ({ destination, date }) => {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Fetch weather data when destination or date changes
     */
    useEffect(() => {
        if (!destination || !destination.lat || !destination.lng) {
            setWeather(null);
            return;
        }

        const fetchWeather = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await weatherService.getForecast(destination.lat, destination.lng, date);
                setWeather(data);
            } catch (err) {
                console.error('Weather widget error', err);
                setError('Forecast unavailable');
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
    }, [destination, date]);

    // Don't render if no destination
    if (!destination || !destination.lat) return null;

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm text-blue-200/60 animate-pulse">
                <div className="h-4 w-4 rounded-full bg-blue-500/20"></div>
                <span>Verificando pronóstico...</span>
            </div>
        );
    }

    // Error state (silent failure)
    if (error) {
        return null;
    }

    // No data state
    if (!weather) return null;

    const { isHazardous, hazardDetails, summary, temperature } = weather;

    // Convert Fahrenheit to Celsius for dual display
    const tempC = Math.round((temperature - 32) * (5 / 9));

    // Translate all text to Spanish
    const translatedSummary = translateText(summary);
    const translatedDetails = hazardDetails.map(translateText);

    // === HAZARDOUS CONDITIONS ALERT ===
    if (isHazardous) {
        return (
            <div className="mt-4 overflow-hidden rounded-xl border border-red-500/30 bg-red-950/20 backdrop-blur-sm">
                {/* Alert Header */}
                <div className="bg-red-500/10 px-4 py-3 border-b border-red-500/20 flex items-start gap-3">
                    <svg className="h-6 w-6 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                        <h3 className="text-sm font-bold text-red-200 uppercase tracking-wide">Alerta Climática</h3>
                        <p className="text-xs text-red-300/80 mt-1">Condiciones peligrosas en el destino</p>
                    </div>
                </div>

                {/* Alert Details */}
                <div className="p-4 space-y-3">
                    {/* Temperature and Summary */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-white">{temperature}°F</span>
                                <span className="text-lg font-medium text-red-200/60">/ {tempC}°C</span>
                            </div>
                            <span className="text-sm text-red-200 border-l border-red-500/30 pl-3 ml-1">{translatedSummary}</span>
                        </div>
                    </div>

                    {/* Hazard Details List */}
                    <div className="space-y-2">
                        {translatedDetails.map((detail, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-red-100 bg-red-500/20 p-2 rounded lg:inline-flex lg:mr-2">
                                <span className="text-red-300">•</span>
                                {detail}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // === GOOD CONDITIONS DISPLAY ===
    return (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <div className="flex items-center gap-3">
                {/* Weather Icon */}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-300">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                </div>

                {/* Weather Info */}
                <div>
                    <p className="text-xs text-blue-200/60 uppercase tracking-wider font-semibold">Clima en el Destino</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-white">{temperature}°F</span>
                        <span className="text-sm text-blue-200/50">/ {tempC}°C</span>
                        <span className="text-sm text-blue-100/80 ml-1 border-l border-white/10 pl-2">{translatedSummary}</span>
                    </div>
                </div>
            </div>

            {/* Good Conditions Badge */}
            <div className="hidden sm:block">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 opacity-70">
                    Buenas Condiciones
                </span>
            </div>
        </div>
    );
};

export default WeatherWidget;
