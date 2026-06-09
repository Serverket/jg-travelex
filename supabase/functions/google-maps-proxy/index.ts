// Supabase Edge Function: Google Maps API Proxy
// Proxies Google Maps API requests to keep the API key server-side only.
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
