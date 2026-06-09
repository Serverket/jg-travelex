const SUPABASE_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || import.meta.env.VITE_SUPABASE_URL
const isLocalFunction = SUPABASE_URL.includes('localhost') || SUPABASE_URL.includes('127.0.0.1')
const SUPABASE_ANON_KEY = isLocalFunction
  ? (import.meta.env.VITE_SUPABASE_LOCAL_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)
  : import.meta.env.VITE_SUPABASE_ANON_KEY

async function callEdgeFunction(service, params) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/google-maps-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ service, params }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

/**
 * Get directions from origin to destination via Edge Function.
 * Returns the HTTP Directions API response (not the JS DirectionsResult).
 */
export async function getDirections(origin, destination) {
  const data = await callEdgeFunction('directions', {
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    mode: 'driving',
  })

  if (data.status === 'ZERO_RESULTS') {
    throw new Error('No se encontró ninguna ruta')
  }
  if (data.status !== 'OK') {
    throw new Error(`Google Directions API error: ${data.status} - ${data.error_message || 'Unknown error'}`)
  }

  return data
}

/**
 * Reverse geocode via Edge Function.
 * Returns the address for a given lat/lng.
 */
export async function reverseGeocode(lat, lng) {
  const data = await callEdgeFunction('geocode', {
    latlng: `${lat},${lng}`,
  })

  if (data.status !== 'OK') {
    throw new Error(`Google Geocoding API error: ${data.status} - ${data.error_message || 'Unknown error'}`)
  }

  return data
}
