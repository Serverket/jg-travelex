const FALLBACK_TEXT = 'No disponible / Not available'

const priceFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2
})

export const formatDurationBilingual = ({ minutes, hours }) => {
  let totalMinutes = Number.isFinite(minutes) ? minutes : null
  if (totalMinutes == null && Number.isFinite(hours)) {
    totalMinutes = Math.round(hours * 60)
  }
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return FALLBACK_TEXT
  }
  const roundedMinutes = Math.max(1, Math.round(totalMinutes))
  const hrs = Math.floor(roundedMinutes / 60)
  const mins = roundedMinutes % 60

  const esParts = []
  const enParts = []

  if (hrs > 0) {
    esParts.push(`${hrs} ${hrs === 1 ? 'hora' : 'horas'}`)
    enParts.push(`${hrs} ${hrs === 1 ? 'hour' : 'hours'}`)
  }
  if (mins > 0) {
    esParts.push(`${mins} ${mins === 1 ? 'minuto' : 'minutos'}`)
    enParts.push(`${mins} ${mins === 1 ? 'minute' : 'minutes'}`)
  }

  if (!esParts.length) {
    esParts.push('1 minuto')
    enParts.push('1 minute')
  }

  return `${esParts.join(' ')} · ${enParts.join(' ')} (aprox.)`
}

export const buildShareMessage = ({ origin, destination, duration, price }) => {
  const safeOrigin = origin || FALLBACK_TEXT
  const safeDestination = destination || FALLBACK_TEXT
  const safeDuration = duration || FALLBACK_TEXT
  const safePrice = price || FALLBACK_TEXT

  const lines = [
    'JGEx - Travel Experience',
    '',
    'Detalles de mi viaje (Trip Details):',
    `Origen (Origin): ${safeOrigin}`,
    `Destino (Destination): ${safeDestination}`,
    `Tiempo (Time — aprox.): ${safeDuration}`,
    `Precio (Price): ${safePrice}`
  ]

  return lines.join('\n')
}

export const formatPriceLabel = (amount) => {
  const parsed = Number.parseFloat(amount)
  if (!Number.isFinite(parsed)) return FALLBACK_TEXT
  return `${priceFormatter.format(parsed)} USD`
}

const sanitizePhoneNumber = (input) => {
  if (typeof input !== 'string') return ''
  const trimmed = input.trim()
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return ''
  return hasPlus ? `+${digits}` : digits
}

export const buildWhatsAppLink = (phoneNumber, message) => {
  const sanitized = sanitizePhoneNumber(phoneNumber)
  const encodedMessage = encodeURIComponent(message)
  if (!sanitized) {
    return `https://wa.me/?text=${encodedMessage}`
  }
  return `https://wa.me/${encodeURIComponent(sanitized)}?text=${encodedMessage}`
}

export const buildMailtoLink = (email, message) => {
  const subject = encodeURIComponent('JGEx Trip Details / Detalles del viaje')
  const body = encodeURIComponent(message)
  const trimmedEmail = (email || '').trim()
  const prefix = trimmedEmail ? `${trimmedEmail}` : ''
  return `mailto:${prefix}?subject=${subject}&body=${body}`
}

export const ensureBilingualLocation = (value) => {
  if (!value) return FALLBACK_TEXT
  const trimmed = `${value}`.trim()
  if (!trimmed) return FALLBACK_TEXT
  return trimmed
}
