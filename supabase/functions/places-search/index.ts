const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  let q = ""
  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}))
    q = body.q || ""
  } else {
    const url = new URL(req.url)
    q = url.searchParams.get("q") || ""
  }

  if (!q || q.length < 3) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS }
    })
  }

  try {
    const photonUrl = `https://photon.komoot.io/api?q=${encodeURIComponent(q)}&limit=50`
    const response = await fetch(photonUrl, {
      headers: { "User-Agent": "JG TravelEx Trip Calculator" }
    })

    const data = await response.json()

    const results = (data.features || [])
      .filter((feature: any) => feature.properties.countrycode === "US")
      .slice(0, 5)
      .map((feature: any) => {
        const p = feature.properties
        const c = feature.geometry.coordinates
        const parts = [p.name, p.street, p.housenumber, p.city || p.town || p.village, p.state, p.country].filter(Boolean)
        const displayName = [...new Set(parts)].join(", ")

        return {
          place_id: p.osm_id,
          display_name: displayName,
          lat: c[1],
          lon: c[0]
        }
      })

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS }
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: "Failed to fetch places" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS }
    })
  }
})
