// Supabase Edge Function: Google Maps API Proxy
// Proxies Google Maps API requests to keep the API key server-side only.
// Usage: POST /functions/v1/google-maps-proxy
// Body: { "service": "directions", "params": { ... } }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // Rate limiting
  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  if (!checkRateLimit(clientIP)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded (60 req/hour)' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Get Google Maps API key from environment (set via supabase secrets)
  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY")
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "GOOGLE_MAPS_API_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const { service, params } = await req.json()

    if (!service) {
      return new Response(JSON.stringify({ error: "Missing 'service' in request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Build the request to Google Maps API
    const baseUrls: Record<string, string> = {
      directions: "https://maps.googleapis.com/maps/api/directions/json",
      geocode: "https://maps.googleapis.com/maps/api/geocode/json",
      places: "https://maps.googleapis.com/maps/api/place/findplacefromtext/json",
      distancematrix: "https://maps.googleapis.com/maps/api/distancematrix/json",
    }

    const baseUrl = baseUrls[service]
    if (!baseUrl) {
      return new Response(JSON.stringify({ error: `Unknown service: ${service}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Build query string from params + append API key
    const queryParams = new URLSearchParams({
      ...params,
      key: apiKey,
    })

    const url = `${baseUrl}?${queryParams.toString()}`

    const response = await fetch(url)
    const data = await response.json()

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
