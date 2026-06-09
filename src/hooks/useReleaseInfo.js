import { useState, useEffect, useRef } from 'react'

const KEY_SEEN    = 'lastSeenVersion'      // updated every visit — tracks what the user has loaded
const KEY_DISMISS = 'lastDismissedVersion' // updated only when user explicitly dismisses

/**
 * Compares two semver strings. Returns true if `a` is strictly newer than `b`.
 */
function isNewer(a, b) {
  if (!a || !b) return false
  const parse = (v) => v.split('.').map(Number)
  const [a1, a2, a3] = parse(a)
  const [b1, b2, b3] = parse(b)
  return a1 > b1 || (a1 === b1 && a2 > b2) || (a1 === b1 && a2 === b2 && a3 > b3)
}

/**
 * Fetches /release-info.json on mount and determines whether to show the update banner.
 *
 * Logic:
 *  - `lastSeenVersion` (localStorage) is recorded on every visit after the fetch.
 *  - `lastDismissedVersion` (localStorage) is set when the user clicks "Más tarde".
 *  - The banner shows ONLY when the live version is strictly newer than lastSeenVersion
 *    AND has not been dismissed for this version already.
 *  - On first ever visit (no lastSeenVersion), we record the current version silently
 *    and do NOT show the banner — there is nothing "new" yet from the user's perspective.
 */
export function useReleaseInfo() {
  const [info, setInfo]   = useState(null)
  const [isNew, setIsNew] = useState(false)
  const resolvedRef = useRef(false)

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await fetch(`/release-info.json?_=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (!data?.version) return

        setInfo(data)

        const seen      = localStorage.getItem(KEY_SEEN)
        const dismissed = localStorage.getItem(KEY_DISMISS)

        if (!seen) {
          // First ever visit — silently record this version, don't show banner.
          localStorage.setItem(KEY_SEEN, data.version)
          return
        }

        const actuallyNewer = isNewer(data.version, seen)
        const notDismissed  = dismissed !== data.version

        if (actuallyNewer && notDismissed) {
          setIsNew(true)
        }

        // Always update lastSeenVersion to the latest fetched, so next visit
        // baseline is the current version (prevents repeated shows after dismiss).
        if (actuallyNewer) {
          localStorage.setItem(KEY_SEEN, data.version)
        }

        resolvedRef.current = true
      } catch {
        // Silent fail — never crash the app over a missing release file
      }
    }

    fetchInfo()
  }, [])

  const dismiss = (version) => {
    const v = version || info?.version || ''
    localStorage.setItem(KEY_DISMISS, v)
    setIsNew(false)
  }

  return { info, isNew, dismiss }
}
