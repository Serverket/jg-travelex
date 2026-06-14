/**
 * EIA Fuel Price Service
 * Fetches regional average gasoline prices from the U.S. Energy Information Administration.
 * Uses EIA API v2 with PADD (Petroleum Administration for Defense Districts) regions.
 * Free API: https://www.eia.gov/opendata/
 *
 * Key: VITE_CIE_FU (obfuscated name)
 */

const EIA_BASE = 'https://api.eia.gov/v2'
const API_KEY = import.meta.env.VITE_CIE_FU
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

async function logApiCall(service) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/log-api-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ service }),
    })
  } catch (err) {
    console.error('Failed to log API call:', err)
  }
}

// State → PADD region mapping (EIA v2 only exposes PADD-level retail prices)
const STATE_TO_PADD = {
  // PADD 1A — New England
  ME: 'R1X', NH: 'R1X', VT: 'R1X', MA: 'R1X', RI: 'R1X', CT: 'R1X',
  // PADD 1B — Central Atlantic
  NY: 'R1Y', NJ: 'R1Y', PA: 'R1Y', DE: 'R1Y', MD: 'R1Y', DC: 'R1Y',
  // PADD 1C — Lower Atlantic
  VA: 'R1Z', WV: 'R1Z', NC: 'R1Z', SC: 'R1Z', GA: 'R1Z', FL: 'R1Z',
  // PADD 2 — Midwest
  OH: 'R20', MI: 'R20', IN: 'R20', IL: 'R20', WI: 'R20', MN: 'R20',
  IA: 'R20', MO: 'R20', ND: 'R20', SD: 'R20', NE: 'R20', KS: 'R20',
  // PADD 3 — Gulf Coast
  TX: 'R30', LA: 'R30', AR: 'R30', NM: 'R30', OK: 'R30',
  // PADD 4 — Rocky Mountain
  CO: 'R40', WY: 'R40', MT: 'R40', ID: 'R40', UT: 'R40', NV: 'R40',
  // PADD 5 — West Coast
  WA: 'R50', OR: 'R50', CA: 'R50', AK: 'R50', HI: 'R50',
}

const PADD_NAMES = {
  R1X: 'PADD 1A (New England)',
  R1Y: 'PADD 1B (Central Atlantic)',
  R1Z: 'PADD 1C (Lower Atlantic)',
  R20: 'PADD 2 (Midwest)',
  R30: 'PADD 3 (Gulf Coast)',
  R40: 'PADD 4 (Rocky Mountain)',
  R50: 'PADD 5 (West Coast)',
  NUS: 'U.S. Nacional',
}

// Cache: { paddCode: { price, timestamp } }
const cache = new Map()
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

function getCacheKey(paddCode) {
  return paddCode || 'NUS'
}

function getCached(paddCode) {
  const key = getCacheKey(paddCode)
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return entry.price
}

function setCached(paddCode, price) {
  cache.set(getCacheKey(paddCode), { price, timestamp: Date.now() })
}

/**
 * Extract a 2-letter US state code from an address string.
 * e.g. "123 Main St, New York, NY 10001" → "NY"
 */
export function extractStateCode(address) {
  if (!address) return null
  const match = address.match(/,\s*([A-Z]{2})\s+\d{5}/)
  return match ? match[1] : null
}

/**
 * Fetch the latest weekly average regular gasoline price for a PADD region.
 * Returns price in $/gallon, or null on failure / no key.
 */
export async function fetchPaddGasPrice(paddCode) {
  if (!API_KEY) return null

  const cacheKey = paddCode || 'NUS'
  const cached = getCached(cacheKey)
  if (cached !== null) return cached

  const duoarea = paddCode || 'NUS'

  try {
    const url = `${EIA_BASE}/petroleum/pri/gnd/data/` +
      `?frequency=weekly` +
      `&data[0]=value` +
      `&facets[duoarea][]=${encodeURIComponent(duoarea)}` +
      `&facets[product][]=EPMR` +
      `&sort[0][column]=period` +
      `&sort[0][direction]=desc` +
      `&offset=0` +
      `&length=1` +
      `&api_key=${encodeURIComponent(API_KEY)}`

    const response = await fetch(url)
    if (!response.ok) return null

    const data = await response.json()
    const rows = data?.response?.data
    if (!Array.isArray(rows) || !rows.length) return null

    const price = Number(rows[0]?.value)
    if (Number.isNaN(price) || price <= 0) return null

    setCached(cacheKey, price)
    logApiCall('eia_fuel_price')
    return price
  } catch (error) {
    console.error('EIA fuel price fetch failed:', error)
    return null
  }
}

/**
 * Fetch fuel prices for a route's origin and destination.
 * Returns { price, priceMin, priceMax, source, paddRegions, reason }
 *
 * If both states differ, returns a min-max range.
 * If same state or one address fails, returns a single price.
 * If API key missing or quota exceeded, returns reason + manual fallback.
 */
export async function fetchRouteFuelPrices(originAddress, destinationAddress) {
  if (!API_KEY) {
    return { price: null, priceMin: null, priceMax: null, source: 'Manual', paddRegions: [], reason: 'no_key' }
  }

  const originState = extractStateCode(originAddress)
  const destState = extractStateCode(destinationAddress)

  if (!originState && !destState) {
    // Try national average
    const national = await fetchPaddGasPrice('NUS')
    if (national) {
      return { price: national, priceMin: null, priceMax: null, source: 'EIA (Nacional)', paddRegions: ['U.S. Nacional'], reason: null }
    }
    return { price: null, priceMin: null, priceMax: null, source: 'Manual', paddRegions: [], reason: 'api_error' }
  }

  const paddCodes = []
  if (originState) {
    const padd = STATE_TO_PADD[originState]
    if (padd && !paddCodes.includes(padd)) paddCodes.push(padd)
  }
  if (destState && destState !== originState) {
    const padd = STATE_TO_PADD[destState]
    if (padd && !paddCodes.includes(padd)) paddCodes.push(padd)
  }

  if (!paddCodes.length) {
    // States not in mapping — try national average
    const national = await fetchPaddGasPrice('NUS')
    if (national) {
      return { price: national, priceMin: null, priceMax: null, source: 'EIA (Nacional)', paddRegions: ['U.S. Nacional'], reason: null }
    }
    return { price: null, priceMin: null, priceMax: null, source: 'Manual', paddRegions: [], reason: 'no_state' }
  }

  const prices = await Promise.all(paddCodes.map((c) => fetchPaddGasPrice(c)))
  const valid = prices.filter((p) => p !== null)

  if (!valid.length) {
    return { price: null, priceMin: null, priceMax: null, source: 'Manual', paddRegions: [], reason: 'api_error' }
  }

  const regionNames = paddCodes.map((c) => PADD_NAMES[c] || c)

  if (valid.length === 1) {
    return { price: valid[0], priceMin: null, priceMax: null, source: `EIA (${regionNames[0]})`, paddRegions: regionNames, reason: null }
  }

  const min = Math.min(...valid)
  const max = Math.max(...valid)
  return {
    price: null,
    priceMin: min,
    priceMax: max,
    source: `EIA (${regionNames.join(' / ')})`,
    paddRegions: regionNames,
    reason: null,
  }
}
