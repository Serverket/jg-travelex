import { useEffect, useRef, useState, useMemo } from 'react'

const PHONE_MIN_LENGTH = 8
const PHONE_MAX_LENGTH = 15

const formatPhoneDisplay = (raw, hadLeadingPlus) => {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return hadLeadingPlus ? '+' : ''
  const chunks = []
  let index = 0
  if (digits.length > 3) {
    chunks.push(digits.slice(0, 3))
    index = 3
  }
  while (index < digits.length) {
    const nextChunk = digits.slice(index, index + 4)
    chunks.push(nextChunk)
    index += 4
  }
  const separator = ' '
  const formatted = chunks.join(separator)
  return hadLeadingPlus ? `+${formatted}` : formatted
}

const validatePhone = (value) => {
  const digits = value.replace(/\D/g, '')
  if (!digits) return 'Ingresa un número válido.'
  if (digits.length < PHONE_MIN_LENGTH) return 'El número es demasiado corto.'
  if (digits.length > PHONE_MAX_LENGTH) return 'El número es demasiado largo.'
  return ''
}

const validateEmail = (value) => {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return 'Ingresa un correo válido.'
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmed)) return 'Formato de correo inválido.'
  return ''
}

const ShareModal = ({ open, mode, onClose, onSubmit, messagePreview }) => {
  const dialogRef = useRef(null)
  const inputRef = useRef(null)
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')

  const title = mode === 'whatsapp'
    ? 'Compartir por WhatsApp'
    : 'Compartir por correo'

  const description = mode === 'whatsapp'
    ? 'Introduce el número del cliente (formato internacional).'
    : 'Introduce el correo electrónico del cliente.'

  useEffect(() => {
    if (open) {
      setInputValue('')
      setError('')
      const timeout = setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timeout)
    }
    return undefined
  }, [open])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!open) return
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  const handleInputChange = (event) => {
    const value = event.target.value
    if (mode === 'whatsapp') {
      const hasPlus = value.trim().startsWith('+')
      const digits = value.replace(/\D/g, '')
      const formatted = formatPhoneDisplay(digits, hasPlus)
      setInputValue(formatted)
      if (error) setError('')
    } else {
      setInputValue(value)
      if (error) setError('')
    }
  }

  const sanitizedRecipient = useMemo(() => {
    if (mode === 'whatsapp') {
      const hasPlus = inputValue.trim().startsWith('+')
      const digits = inputValue.replace(/\D/g, '')
      if (!digits) return ''
      return hasPlus ? `+${digits}` : digits
    }
    return inputValue.trim().toLowerCase()
  }, [inputValue, mode])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!open) return

    const validationError = mode === 'whatsapp'
      ? validatePhone(inputValue)
      : validateEmail(inputValue)
    if (validationError) {
      setError(validationError)
      return
    }

    onSubmit(sanitizedRecipient)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/90 shadow-2xl shadow-slate-950/60 backdrop-blur-lg"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-6 text-blue-100">
          <header>
            <h2 id="share-modal-title" className="text-lg font-semibold text-white">
              {title}
            </h2>
            <p className="mt-1 text-sm text-blue-200/70">{description}</p>
          </header>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-blue-100/90">
              {mode === 'whatsapp' ? 'Número del cliente' : 'Correo del cliente'}
            </span>
            <input
              ref={inputRef}
              type="text"
              inputMode={mode === 'whatsapp' ? 'tel' : 'email'}
              autoComplete={mode === 'whatsapp' ? 'tel' : 'email'}
              value={inputValue}
              onChange={handleInputChange}
              className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-base text-white shadow-inner shadow-blue-500/10 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
              placeholder={mode === 'whatsapp' ? '+58 414 000 0000' : 'cliente@correo.com'}
            />
            {error && (
              <span className="text-xs font-medium text-rose-300">{error}</span>
            )}
          </label>

          <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-blue-100/80">
            <p className="font-semibold text-blue-100">Vista previa del mensaje</p>
            <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap text-[11px] text-blue-100/80">
              {messagePreview}
            </pre>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:bg-white/10 sm:w-auto"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-full rounded-xl border border-blue-400/40 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-white shadow-inner shadow-blue-500/20 transition hover:bg-blue-500/30 sm:w-auto"
            >
              Compartir
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ShareModal
