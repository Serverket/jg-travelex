// Supabase Edge Function: Google Maps API Proxy
// Proxies Google Maps API requests to keep the API key server-side only.
// Also validates the configured API key before proxying any request.
// Usage: POST /functions/v1/google-maps-proxy
// Body: { "service": "directions", "params": { ... } }

// CORS headers — attached to every response so preflight and real requests both pass
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

// Rate limiter: max 60 requests/hour per IP
const requestCounts = new Map()

// Cache for validated API keys (avoid hammering Google with validation requests)
const keyValidationCache = new Map<string, { valid: boolean; timestamp: number }>()
const KEY_VALIDATION_TTL_MS = 5 * 60 * 1000 // 5 minutes

function checkRateLimit(clientIP: string): boolean {
  const hourKey = Math.floor(Date.now() / 1000 / 60 / 60)
  const key = `${clientIP}-${hourKey}`
  const current = requestCounts.get(key) || 0
  if (current > 60) return false
  requestCounts.set(key, current + 1)
  return true
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  })
}

/**
 * Validate that the Google Maps API key is properly configured and functional.
 * Makes a lightweight test request to the Geocoding API.
 */
async function validateGoogleApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  // Basic format validation
  if (!apiKey.startsWith("AIza") || apiKey.length < 30) {
    return { valid: false, error: "Invalid API key format" }
  }

  // Check cache
  const cached = keyValidationCache.get(apiKey)
  if (cached && Date.now() - cached.timestamp < KEY_VALIDATION_TTL_MS) {
    return { valid: cached.valid }
  }

  try {
    // Make a lightweight validation request (geocode a known location)
    const testUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=40.7128,-74.0060&key=${apiKey}`
    const response = await fetch(testUrl, { method: "GET" })
    const data = await response.json()

    if (data.status === "REQUEST_DENIED" || data.status === "INVALID_REQUEST") {
      keyValidationCache.set(apiKey, { valid: false, timestamp: Date.now() })
      return { valid: false, error: `Google API rejected the key: ${data.status}` }
    }

    if (data.status === "OVER_QUERY_LIMIT") {
      keyValidationCache.set(apiKey, { valid: false, timestamp: Date.now() })
      return { valid: false, error: "Google API quota exceeded" }
    }

    // If we get OK or ZERO_RESULTS, the key is valid
    keyValidationCache.set(apiKey, { valid: true, timestamp: Date.now() })
    return { valid: true }
  } catch (err) {
    keyValidationCache.set(apiKey, { valid: false, timestamp: Date.now() })
    return { valid: false, error: `Validation request failed: ${(err as Error).message}` }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight — must respond 204 before any other checks
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS })
  }

  // Only allow POST after preflight
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405)
  }

  // Rate limiting
  const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
  if (!checkRateLimit(clientIP)) {
    return json({ error: "Rate limit exceeded (60 req/hour)" }, 429)
  }

  // Get Google Maps API key from environment (set via `supabase secrets set GOOGLE_MAPS_API_KEY=...`)
  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY")
  if (!apiKey) {
    return json({ error: "GOOGLE_MAPS_API_KEY not configured" }, 500)
  }

  // Validate the API key before proxying
  const validation = await validateGoogleApiKey(apiKey)
  if (!validation.valid) {
    console.error("Google Maps API key validation failed:", validation.error)
    return json({ error: `API key validation failed: ${validation.error}` }, 500)
  }

  try {
    const { service, params } = await req.json()

    if (!service) {
      return json({ error: "Missing 'service' in request body" }, 400)
    }

    const baseUrls: Record<string, string> = {
      directions: "https://maps.googleapis.com/maps/api/directions/json",
      geocode: "https://maps.googleapis.com/maps/api/geocode/json",
      places: "https://maps.googleapis.com/maps/api/place/findplacefromtext/json",
      autocomplete: "https://maps.googleapis.com/maps/api/place/autocomplete/json",
      distancematrix: "https://maps.googleapis.com/maps/api/distancematrix/json",
    }

    const baseUrl = baseUrls[service]
    if (!baseUrl) {
      return json({ error: `Unknown service: ${service}` }, 400)
    }

    // Build query string from params + append API key
    const queryParams = new URLSearchParams({ ...params, key: apiKey })
    const url = `${baseUrl}?${queryParams.toString()}`

    const response = await fetch(url)
    const data = await response.json()

    return json(data)
  } catch (error) {
    return json({ error: (error as Error).message }, 500)
  }
})
