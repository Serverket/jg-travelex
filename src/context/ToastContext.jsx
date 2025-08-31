import React, { createContext, useContext, useCallback, useMemo, useRef, useState, useEffect } from 'react'

const ToastContext = createContext(null)

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

const typeStyles = {
  success: 'border-green-500 bg-white',
  error: 'border-red-500 bg-white',
  info: 'border-blue-500 bg-white',
  warning: 'border-yellow-500 bg-white',
}

const typeIcons = {
  success: (
    <svg className="h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
  ),
  error: (
    <svg className="h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
  ),
  info: (
    <svg className="h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01" /></svg>
  ),
  warning: (
    <svg className="h-5 w-5 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
  ),
}

function ToastList({ toasts, onClose }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-[min(92vw,22rem)]">
      {toasts.map(t => (
        <div key={t.id} className={`shadow rounded border-l-4 ${typeStyles[t.type]} px-4 py-3 transition transform`} role="alert">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{typeIcons[t.type]}</div>
            <div className="flex-1">
              {t.title && <div className="font-semibold text-gray-900">{t.title}</div>}
              <div className="text-sm text-gray-700 whitespace-pre-line">{t.message}</div>
            </div>
            <button className="text-gray-400 hover:text-gray-600" onClick={() => onClose(t.id)} aria-label="Dismiss">
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export const ToastProvider = ({ children, defaultDuration = 4000 }) => {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const add = useCallback((message, { type = 'info', title, duration } = {}) => {
    idRef.current += 1
    const id = idRef.current
    const toast = { id, type, title, message, duration: duration ?? defaultDuration }
    setToasts(prev => [...prev, toast])

    if (toast.duration > 0) {
      setTimeout(() => remove(id), toast.duration)
    }
    return id
  }, [defaultDuration, remove])

  const api = useMemo(() => ({
    addToast: add,
    removeToast: remove,
    success: (msg, opts = {}) => add(msg, { ...opts, type: 'success' }),
    error: (msg, opts = {}) => add(msg, { ...opts, type: 'error' }),
    info: (msg, opts = {}) => add(msg, { ...opts, type: 'info' }),
    warning: (msg, opts = {}) => add(msg, { ...opts, type: 'warning' }),
  }), [add, remove])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastList toasts={toasts} onClose={remove} />
    </ToastContext.Provider>
  )
}
