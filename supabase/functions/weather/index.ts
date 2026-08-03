const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes
const forecastCache = new Map<string, { timestamp: number; data: any }>()

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const url = new URL(req.url)
  const lat = parseFloat(url.searchParams.get("lat") || "")
  const lng = parseFloat(url.searchParams.get("lng") || "")
  const date = url.searchParams.get("date") || null

  if (isNaN(lat) || isNaN(lng)) {
    return new Response(JSON.stringify({ error: "Latitude and Longitude required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS }
    })
  }

  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)},${date || "current"}`
  const cached = forecastCache.get(cacheKey)
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return new Response(JSON.stringify(cached.data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS }
    })
  }

  try {
    const weatherApiKey = Deno.env.get("WEATHER_API_KEY")

    const [omRes, waRes] = await Promise.allSettled([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=14&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`).then(r => r.ok ? r.json() : null),
      weatherApiKey ? fetch(`http://api.weatherapi.com/v1/forecast.json?key=${weatherApiKey}&q=${lat},${lng}&days=1&alerts=yes${date ? `&dt=${date}` : ''}`).then(r => r.ok ? r.json() : null) : Promise.resolve(null)
    ])

    const omData = omRes.status === "fulfilled" ? omRes.value : null
    const waData = waRes.status === "fulfilled" ? waRes.value : null

    if (!omData && !waData) {
      throw new Error("All weather providers failed")
    }

    const assessment = assessWeatherConditions(omData, waData, date)
    forecastCache.set(cacheKey, { timestamp: Date.now(), data: assessment })

    return new Response(JSON.stringify(assessment), {
      status: 200,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS }
    })
  }
})

function assessWeatherConditions(omData: any, waData: any, targetDate: string | null) {
  let isHazardous = false
  let hazardDetails: string[] = []
  let summary = "Unknown"
  let temperature: number | null = null

  if (omData?.current) {
    temperature = omData.current.temperature_2m
    if (omData.current.wind_speed_10m > 40) {
      isHazardous = true
      hazardDetails.push(`High winds (${omData.current.wind_speed_10m} mph)`)
    }
    if (omData.current.temperature_2m <= 32) {
      isHazardous = true
      hazardDetails.push("Freezing temperatures")
    }
    summary = "Forecast available"
  }

  if (waData?.alerts?.alert?.length) {
    waData.alerts.alert.forEach((a: any) => {
      isHazardous = true
      hazardDetails.push(`Alert: ${a.event}`)
    })
  }

  return {
    isHazardous,
    hazardDetails,
    summary,
    temperature,
    targetDate: targetDate || new Date().toISOString().split("T")[0],
    source: { openMeteo: !!omData, weatherApi: !!waData },
    timestamp: new Date().toISOString()
  }
}
