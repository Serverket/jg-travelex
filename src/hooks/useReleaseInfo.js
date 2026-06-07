import { useState, useEffect } from 'react'

const STORAGE_KEY = 'lastDismissedVersion'

export function useReleaseInfo() {
  const [info, setInfo] = useState(null)
  const [isNew, setIsNew] = useState(false)

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await fetch(`/release-info.json?_=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        setInfo(data)

        const dismissed = localStorage.getItem(STORAGE_KEY)
        if (data.version && data.version !== dismissed) {
          setIsNew(true)
        }
      } catch {
        // Silent fail
      }
    }

    fetchInfo()
  }, [])

  const dismiss = (version) => {
    localStorage.setItem(STORAGE_KEY, version || info?.version || '')
    setIsNew(false)
  }

  return { info, isNew, dismiss }
}
