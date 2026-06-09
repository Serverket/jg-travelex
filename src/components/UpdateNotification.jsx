import { useEffect, useRef } from 'react'
import { useReleaseInfo } from '../hooks/useReleaseInfo'

export default function UpdateNotification() {
  const { info, isNew, dismiss } = useReleaseInfo()
  const swReg = useRef(null)

  // Also listen for the PWA service worker entering the `waiting` state.
  // When vite-plugin-pwa emits `sw-updated`, a new SW is ready but waiting —
  // we capture the registration so the Update button can call skipWaiting.
  useEffect(() => {
    const handler = (event) => {
      swReg.current = event.detail
    }
    window.addEventListener('sw-updated', handler)
    return () => window.removeEventListener('sw-updated', handler)
  }, [])

  if (!isNew || !info) return null

  const handleUpdate = () => {
    dismiss(info.version)
    // If a waiting SW exists, tell it to take control immediately,
    // then reload once the new SW has activated.
    if (swReg.current?.waiting) {
      swReg.current.waiting.postMessage({ type: 'SKIP_WAITING' })
      swReg.current.addEventListener('statechange', (e) => {
        if (e.target.state === 'activated') window.location.reload()
      })
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-blue-400/30 bg-blue-500/15 px-5 py-3 text-sm text-blue-100 backdrop-blur">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="font-semibold text-blue-50">
            Nueva versión disponible: v{info.version}
          </p>
          {info.note && (
            <p className="mt-1 text-blue-100/80">{info.note}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleUpdate}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            Actualizar
          </button>
          <button
            onClick={() => dismiss(info.version)}
            className="rounded-lg border border-blue-400/30 px-4 py-2 text-sm text-blue-100 transition hover:bg-blue-500/10"
          >
            Más tarde
          </button>
        </div>
      </div>
    </div>
  )
}
