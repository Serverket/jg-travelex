import { useState, useEffect } from 'react';
import { weatherService } from '../services/weatherService';

// Translation Dictionary
const TRANSLATIONS = {
    // WMO Codes
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

    // Hazards
    'Thunderstorms expected': 'Se esperan tormentas eléctricas',
    'Thunderstorm detected': 'Tormenta eléctrica detectada',
    'High winds forecast': 'Vientos fuertes pronosticados',
    'High winds': 'Vientos fuertes',
    'Heavy rain expected': 'Lluvia intensa esperada',
    'Heavy precipitation': 'Precipitación intensa',
};

// Helper to translate dynamic strings like "High winds (75 km/h)"
const translateText = (text) => {
    if (!text) return '';

    // Direct lookup
    if (TRANSLATIONS[text]) return TRANSLATIONS[text];

    // Regex for "High winds (...)"
    if (text.includes('High winds')) {
        return text.replace('High winds', 'Vientos fuertes').replace('forecast', 'pronosticados');
    }
    if (text.includes('Heavy rain')) {
        return text.replace('Heavy rain', 'Lluvia intensa').replace('expected', 'esperada');
    }

    // Handle Alerts specially
    if (text.startsWith('Alert:')) {
        // We keep the official alert text but translate the prefix
        return text.replace('Alert:', 'Alerta Oficial:');
    }

    return text; // Fallback to original if no translation found
};

const WeatherWidget = ({ destination, date }) => {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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

    if (!destination || !destination.lat) return null;

    if (loading) {
        return (
            <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm text-blue-200/60 animate-pulse">
                <div className="h-4 w-4 rounded-full bg-blue-500/20"></div>
                <span>Verificando pronóstico...</span>
            </div>
        );
    }

    if (error) {
        return null;
    }

    if (!weather) return null;

    const { isHazardous, hazardDetails, summary, temperature } = weather;

    // Apply translation
    const translatedSummary = translateText(summary);
    const translatedDetails = hazardDetails.map(translateText);

    if (isHazardous) {
        return (
            <div className="mt-4 overflow-hidden rounded-xl border border-red-500/30 bg-red-950/20 backdrop-blur-sm">
                <div className="bg-red-500/10 px-4 py-3 border-b border-red-500/20 flex items-start gap-3">
                    <svg className="h-6 w-6 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                        <h3 className="text-sm font-bold text-red-200 uppercase tracking-wide">Alerta Climática</h3>
                        <p className="text-xs text-red-300/80 mt-1">Condiciones peligrosas en el destino</p>
                    </div>
                </div>

                <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-white">{temperature}°C</span>
                            <span className="text-sm text-red-200">{translatedSummary}</span>
                        </div>
                    </div>

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

    return (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-300">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                </div>
                <div>
                    <p className="text-xs text-blue-200/60 uppercase tracking-wider font-semibold">Clima en el Destino</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-white">{temperature}°C</span>
                        <span className="text-sm text-blue-100/80">{translatedSummary}</span>
                    </div>
                </div>
            </div>
            <div className="hidden sm:block">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 opacity-70">
                    Buenas Condiciones
                </span>
            </div>
        </div>
    );
};

export default WeatherWidget;
