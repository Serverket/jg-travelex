// Supabase Edge Function: log-api-call
// Lightweight endpoint for the frontend to log any API call usage.
// Usage: POST /functions/v1/log-api-call
// Body: { "service": "eia_fuel_price" }

// CORS headers
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS })
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405)
  }

  const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"

  try {
    const { service } = await req.json()
    if (!service) {
      return json({ error: "Missing 'service' in request body" }, 400)
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !serviceRole) {
      return json({ error: "Supabase not configured" }, 500)
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/api_usage_logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceRole,
        "Authorization": `Bearer ${serviceRole}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ service, ip_address: clientIP }),
    })

    if (!response.ok) {
      console.error("Failed to insert log:", await response.text())
      return json({ error: "Failed to log" }, 500)
    }

    return json({ ok: true })
  } catch (error) {
    console.error("log-api-call error:", error)
    return json({ error: (error as Error).message }, 500)
  }
})
