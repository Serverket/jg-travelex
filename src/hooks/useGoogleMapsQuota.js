const DAILY_AUTOCOMPLETE_LIMIT = 50
const DAILY_DIRECTIONS_LIMIT = 30

function getTodayKey() {
  return new Date().toISOString().split('T')[0]
}

export function useGoogleMapsQuota() {
  const today = getTodayKey()
  const key = `gm-quota-${today}`

  const getCounts = () => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : { autocomplete: 0, directions: 0 }
    } catch { return { autocomplete: 0, directions: 0 } }
  }

  const increment = (type) => {
    const counts = getCounts()
    counts[type] = (counts[type] || 0) + 1
    localStorage.setItem(key, JSON.stringify(counts))
    return counts
  }

  const getStatus = () => {
    const counts = getCounts()
    return {
      autocomplete: {
        used: counts.autocomplete,
        limit: DAILY_AUTOCOMPLETE_LIMIT,
        percent: Math.round((counts.autocomplete / DAILY_AUTOCOMPLETE_LIMIT) * 100)
      },
      directions: {
        used: counts.directions,
        limit: DAILY_DIRECTIONS_LIMIT,
        percent: Math.round((counts.directions / DAILY_DIRECTIONS_LIMIT) * 100)
      }
    }
  }

  const reset = () => {
    localStorage.removeItem(key)
  }

  return { increment, getStatus, reset }
}
