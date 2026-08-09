import { useState, useEffect, useCallback } from 'react'

const ConfirmDialog = ({
  open,
  title = 'Confirmar acción',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  typeToConfirm = null,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (!open) setTyped('')
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, loading, onCancel])

  const canConfirm = useCallback(() => {
    if (loading) return false
    if (typeToConfirm) return typed.trim().toUpperCase() === typeToConfirm.toUpperCase()
    return true
  }, [loading, typeToConfirm, typed])

  if (!open) return null

  const confirmClasses = destructive
    ? 'bg-rose-600 hover:bg-rose-500 focus:ring-rose-400/60 disabled:bg-rose-600/40'
    : 'bg-blue-600 hover:bg-blue-500 focus:ring-blue-400/60 disabled:bg-blue-600/40'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => !loading && onCancel()}
      />
      <div
        className={`relative w-full max-w-md rounded-3xl border p-6 shadow-2xl transition-all ${
          destructive
            ? 'border-rose-500/30 bg-slate-900/95 shadow-rose-900/40'
            : 'border-white/15 bg-slate-900/95 shadow-blue-900/40'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-4">
          {destructive && (
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-rose-500/15">
              <svg className="h-6 w-6 text-rose-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
          )}
          <div className="flex-1">
            <h3 className={`text-lg font-semibold ${destructive ? 'text-rose-100' : 'text-white'}`}>
              {title}
            </h3>
            {message && (
              <div className="mt-2 text-sm text-blue-100/70 whitespace-pre-line">
                {message}
              </div>
            )}
          </div>
        </div>

        {typeToConfirm && (
          <div className="mt-5">
            <label className="block text-xs font-medium text-blue-100/60">
              Escriba <span className="font-bold text-rose-300">{typeToConfirm}</span> para confirmar
            </label>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              disabled={loading}
              className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 shadow-inner shadow-blue-500/10 transition focus:border-rose-400/60 focus:outline-none focus:ring-2 focus:ring-rose-400/40"
              placeholder={typeToConfirm}
            />
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-blue-100/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm()}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all focus:outline-none focus:ring-2 disabled:cursor-not-allowed ${confirmClasses}`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Procesando...
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
