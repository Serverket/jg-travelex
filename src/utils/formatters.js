/**
 * Formatea un número como moneda en dólares
 * @param {number} value - Valor a formatear
 * @param {number} decimals - Número de decimales (por defecto 2)
 * @returns {string} - Valor formateado como moneda
 */
export const formatCurrency = (value, decimals = 2) => {
  if (value === null || value === undefined) return '$0.00'
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

/**
 * Formatea un número con separadores de miles
 * @param {number} value - Valor a formatear
 * @param {number} decimals - Número de decimales (por defecto 2)
 * @returns {string} - Valor formateado
 */
export const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined) return '0'
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

/**
 * Formatea una distancia en millas
 * @param {number} miles - Distancia en millas
 * @param {number} decimals - Número de decimales (por defecto 1)
 * @returns {string} - Distancia formateada
 */
export const formatDistance = (miles, decimals = 1) => {
  if (miles === null || miles === undefined) return '0 mi'
  
  return `${formatNumber(miles, decimals)} mi`
}

/**
 * Formatea una duración en segundos a formato legible
 * @param {number} seconds - Duración en segundos
 * @returns {string} - Duración formateada
 */
export const formatDuration = (seconds) => {
  if (!seconds) return '0m'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

/**
 * Formatea una fecha a formato local
 * @param {string|Date} date - Fecha a formatear
 * @param {object} options - Opciones de formato
 * @returns {string} - Fecha formateada
 */
export const formatDate = (date, options = {}) => {
  if (!date) return ''
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
  
  const mergedOptions = { ...defaultOptions, ...options }
  
  return new Date(date).toLocaleDateString('en-US', mergedOptions)
}

/**
 * Formatea una fecha y hora a formato local
 * @param {string|Date} date - Fecha a formatear
 * @param {object} options - Opciones de formato
 * @returns {string} - Fecha y hora formateada
 */
export const formatDateTime = (date, options = {}) => {
  if (!date) return ''
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
  
  const mergedOptions = { ...defaultOptions, ...options }
  
  return new Date(date).toLocaleString('en-US', mergedOptions)
}

/**
 * Obtiene la fecha actual en formato ISO
 * @returns {string} - Fecha actual en formato ISO
 */
export const getCurrentDate = () => {
  return new Date().toISOString()
}

/**
 * Obtiene la fecha de inicio de un período (día, semana, mes, año)
 * @param {string} period - Período ('day', 'week', 'month', 'year')
 * @param {Date} date - Fecha de referencia (por defecto fecha actual)
 * @returns {Date} - Fecha de inicio del período
 */
export const getStartOfPeriod = (period, date = new Date()) => {
  const result = new Date(date)
  
  switch (period) {
    case 'day':
      result.setHours(0, 0, 0, 0)
      break
    case 'week':
      const day = result.getDay() // 0 = domingo, 1 = lunes, ...
      result.setDate(result.getDate() - day) // Retroceder al domingo
      result.setHours(0, 0, 0, 0)
      break
    case 'month':
      result.setDate(1)
      result.setHours(0, 0, 0, 0)
      break
    case 'year':
      result.setMonth(0, 1) // Enero 1
      result.setHours(0, 0, 0, 0)
      break
    default:
      break
  }
  
  return result
}

/**
 * Obtiene la fecha de fin de un período (día, semana, mes, año)
 * @param {string} period - Período ('day', 'week', 'month', 'year')
 * @param {Date} date - Fecha de referencia (por defecto fecha actual)
 * @returns {Date} - Fecha de fin del período
 */
export const getEndOfPeriod = (period, date = new Date()) => {
  const result = new Date(date)
  
  switch (period) {
    case 'day':
      result.setHours(23, 59, 59, 999)
      break
    case 'week':
      const day = result.getDay() // 0 = domingo, 1 = lunes, ...
      result.setDate(result.getDate() + (6 - day)) // Avanzar al sábado
      result.setHours(23, 59, 59, 999)
      break
    case 'month':
      result.setMonth(result.getMonth() + 1, 0) // Último día del mes
      result.setHours(23, 59, 59, 999)
      break
    case 'year':
      result.setMonth(11, 31) // Diciembre 31
      result.setHours(23, 59, 59, 999)
      break
    default:
      break
  }
  
  return result
}

/**
 * Genera un ID único
 * @returns {string} - ID único
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
}

/**
 * Trunca un texto a una longitud máxima
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} - Texto truncado
 */
export const truncateText = (text, maxLength = 30) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  
  return text.substring(0, maxLength) + '...'
}