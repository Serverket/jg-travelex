/**
 * Valida si un valor está vacío
 * @param {*} value - Valor a validar
 * @returns {boolean} - true si está vacío, false en caso contrario
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (typeof value === 'object') {
    if (Array.isArray(value)) return value.length === 0
    return Object.keys(value).length === 0
  }
  return false
}

/**
 * Valida si un valor es un número válido
 * @param {*} value - Valor a validar
 * @returns {boolean} - true si es un número válido, false en caso contrario
 */
export const isNumber = (value) => {
  if (value === null || value === undefined || value === '') return false
  return !isNaN(Number(value))
}

/**
 * Valida si un valor es un número positivo
 * @param {*} value - Valor a validar
 * @returns {boolean} - true si es un número positivo, false en caso contrario
 */
export const isPositiveNumber = (value) => {
  if (!isNumber(value)) return false
  return Number(value) > 0
}

/**
 * Valida si un valor es un número no negativo (cero o positivo)
 * @param {*} value - Valor a validar
 * @returns {boolean} - true si es un número no negativo, false en caso contrario
 */
export const isNonNegativeNumber = (value) => {
  if (!isNumber(value)) return false
  return Number(value) >= 0
}

/**
 * Valida si un valor es un porcentaje válido (entre 0 y 100)
 * @param {*} value - Valor a validar
 * @returns {boolean} - true si es un porcentaje válido, false en caso contrario
 */
export const isValidPercentage = (value) => {
  if (!isNumber(value)) return false
  const num = Number(value)
  return num >= 0 && num <= 100
}

/**
 * Valida si un valor es una dirección de correo electrónico válida
 * @param {string} value - Valor a validar
 * @returns {boolean} - true si es una dirección de correo válida, false en caso contrario
 */
export const isValidEmail = (value) => {
  if (isEmpty(value)) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value)
}

/**
 * Valida si un valor es una fecha válida
 * @param {*} value - Valor a validar
 * @returns {boolean} - true si es una fecha válida, false en caso contrario
 */
export const isValidDate = (value) => {
  if (isEmpty(value)) return false
  const date = new Date(value)
  return !isNaN(date.getTime())
}

/**
 * Valida si un valor es una URL válida
 * @param {string} value - Valor a validar
 * @returns {boolean} - true si es una URL válida, false en caso contrario
 */
export const isValidUrl = (value) => {
  if (isEmpty(value)) return false
  try {
    new URL(value)
    return true
  } catch (e) {
    return false
  }
}

/**
 * Valida si un objeto tiene todas las propiedades requeridas
 * @param {object} obj - Objeto a validar
 * @param {string[]} requiredProps - Lista de propiedades requeridas
 * @returns {boolean} - true si tiene todas las propiedades requeridas, false en caso contrario
 */
export const hasRequiredProps = (obj, requiredProps) => {
  if (!obj || typeof obj !== 'object') return false
  return requiredProps.every(prop => {
    return Object.prototype.hasOwnProperty.call(obj, prop) && !isEmpty(obj[prop])
  })
}

/**
 * Valida credenciales de usuario
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña
 * @returns {boolean} - true si las credenciales son válidas, false en caso contrario
 */
export const validateCredentials = (username, password) => {
  const validUsername = import.meta.env.VITE_APP_USERNAME
  const validPassword = import.meta.env.VITE_APP_PASSWORD
  
  return username === validUsername && password === validPassword
}

/**
 * Valida si un objeto de viaje tiene todos los datos necesarios
 * @param {object} trip - Objeto de viaje a validar
 * @returns {boolean} - true si el viaje es válido, false en caso contrario
 */
export const isValidTrip = (trip) => {
  if (!trip || typeof trip !== 'object') return false
  
  const requiredProps = [
    'origin',
    'destination',
    'distance',
    'duration',
    'date',
    'basePrice',
    'finalPrice'
  ]
  
  return hasRequiredProps(trip, requiredProps) &&
    isPositiveNumber(trip.distance) &&
    isPositiveNumber(trip.duration) &&
    isValidDate(trip.date) &&
    isPositiveNumber(trip.basePrice) &&
    isPositiveNumber(trip.finalPrice) &&
    trip.origin.lat && trip.origin.lng && trip.origin.address &&
    trip.destination.lat && trip.destination.lng && trip.destination.address
}

/**
 * Valida si un objeto de configuración de tarifas es válido
 * @param {object} settings - Objeto de configuración a validar
 * @returns {boolean} - true si la configuración es válida, false en caso contrario
 */
export const isValidRateSettings = (settings) => {
  if (!settings || typeof settings !== 'object') return false
  
  return isNonNegativeNumber(settings.baseMileRate) &&
    isNonNegativeNumber(settings.baseHourRate) &&
    Array.isArray(settings.surchargeFactors) &&
    Array.isArray(settings.discounts)
}