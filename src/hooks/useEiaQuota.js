const DAILY_EIA_LIMIT = 20

function getTodayKey() {
  return new Date().toISOString().split('T')[0]
}

export function useEiaQuota() {
  const today = getTodayKey()
  const key = `eia-quota-${today}`

  const getCount = () => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : 0
    } catch {
      return 0
    }
  }

  const increment = () => {
    const count = getCount()
    const next = count + 1
    localStorage.setItem(key, JSON.stringify(next))
    return next
  }

  const getStatus = () => {
    const used = getCount()
    return {
      used,
      limit: DAILY_EIA_LIMIT,
      percent: Math.round((used / DAILY_EIA_LIMIT) * 100),
    }
  }

  const reset = () => {
    localStorage.removeItem(key)
  }

  return { increment, getStatus, reset }
}
