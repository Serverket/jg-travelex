import { createContext, useContext, useState, useEffect } from 'react'

// Crear el contexto
const AppContext = createContext()

// Hook personalizado para usar el contexto
export const useAppContext = () => useContext(AppContext)

// Proveedor del contexto
export const AppProvider = ({ children }) => {
  // Estado para las tarifas y configuraciones
  const [rateSettings, setRateSettings] = useState({
    baseMileRate: 1.5, // Tarifa base por milla
    baseHourRate: 15,   // Tarifa base por hora
    surchargeFactors: [
      { id: 1, name: 'Lluvia', active: false, rate: 10, type: 'percentage' },
      { id: 2, name: 'Tráfico intenso', active: false, rate: 15, type: 'percentage' },
      { id: 3, name: 'Horario nocturno', active: false, rate: 20, type: 'percentage' },
    ],
    discounts: [
      { id: 1, name: 'Cliente frecuente', active: false, rate: 10, type: 'percentage' },
      { id: 2, name: 'Promoción', active: false, rate: 5, type: 'fixed' },
    ]
  })

  // Estado para los viajes
  const [trips, setTrips] = useState([])

  // Estado para las órdenes y facturas
  const [orders, setOrders] = useState([])
  const [invoices, setInvoices] = useState([])

  // Cargar datos desde localStorage al iniciar
  useEffect(() => {
    const savedRateSettings = localStorage.getItem('rateSettings')
    const savedTrips = localStorage.getItem('trips')
    const savedOrders = localStorage.getItem('orders')
    const savedInvoices = localStorage.getItem('invoices')

    if (savedRateSettings) setRateSettings(JSON.parse(savedRateSettings))
    if (savedTrips) setTrips(JSON.parse(savedTrips))
    if (savedOrders) setOrders(JSON.parse(savedOrders))
    if (savedInvoices) setInvoices(JSON.parse(savedInvoices))
  }, [])

  // Guardar datos en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('rateSettings', JSON.stringify(rateSettings))
  }, [rateSettings])

  useEffect(() => {
    localStorage.setItem('trips', JSON.stringify(trips))
  }, [trips])

  useEffect(() => {
    localStorage.setItem('orders', JSON.stringify(orders))
  }, [orders])

  useEffect(() => {
    localStorage.setItem('invoices', JSON.stringify(invoices))
  }, [invoices])

  // Función para actualizar las tarifas
  const updateRateSettings = (newSettings) => {
    setRateSettings(newSettings)
  }

  // Función para añadir un nuevo factor de recargo
  const addSurchargeFactor = (factor) => {
    setRateSettings(prev => ({
      ...prev,
      surchargeFactors: [...prev.surchargeFactors, {
        id: Date.now(),
        name: factor.name,
        active: false,
        rate: factor.rate,
        type: factor.type
      }]
    }))
  }

  // Función para añadir un nuevo descuento
  const addDiscount = (discount) => {
    setRateSettings(prev => ({
      ...prev,
      discounts: [...prev.discounts, {
        id: Date.now(),
        name: discount.name,
        active: false,
        rate: discount.rate,
        type: discount.type
      }]
    }))
  }

  // Función para añadir un nuevo viaje
  const addTrip = (trip) => {
    const newTrip = {
      id: Date.now(),
      date: new Date().toISOString(),
      ...trip
    }
    setTrips(prev => [...prev, newTrip])
    return newTrip
  }

  // Función para crear una nueva orden
  const createOrder = (tripData) => {
    const newOrder = {
      id: Date.now(),
      date: new Date().toISOString(),
      tripData,
      status: 'pending' // pending, completed, cancelled
    }
    setOrders(prev => [...prev, newOrder])
    return newOrder
  }

  // Función para crear una nueva factura
  const createInvoice = (orderId) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return null

    const newInvoice = {
      id: Date.now(),
      date: new Date().toISOString(),
      orderId,
      orderData: order,
      status: 'issued' // issued, paid
    }
    setInvoices(prev => [...prev, newInvoice])
    return newInvoice
  }

  // Función para calcular el precio de un viaje
  const calculateTripPrice = (distance, duration, activeSurcharges, activeDiscounts) => {
    // Cálculo base por distancia y duración
    const distancePrice = distance * rateSettings.baseMileRate
    const durationPrice = (duration / 60) * rateSettings.baseHourRate // Convertir minutos a horas
    
    let totalPrice = distancePrice + durationPrice
    
    // Aplicar recargos
    activeSurcharges.forEach(surchargeId => {
      const surcharge = rateSettings.surchargeFactors.find(s => s.id === surchargeId)
      if (surcharge) {
        if (surcharge.type === 'percentage') {
          totalPrice += totalPrice * (surcharge.rate / 100)
        } else {
          totalPrice += surcharge.rate
        }
      }
    })
    
    // Aplicar descuentos
    activeDiscounts.forEach(discountId => {
      const discount = rateSettings.discounts.find(d => d.id === discountId)
      if (discount) {
        if (discount.type === 'percentage') {
          totalPrice -= totalPrice * (discount.rate / 100)
        } else {
          totalPrice -= discount.rate
        }
      }
    })
    
    return Math.max(0, totalPrice).toFixed(2) // Asegurar que el precio no sea negativo
  }

  // Valor del contexto
  const value = {
    rateSettings,
    trips,
    orders,
    invoices,
    updateRateSettings,
    addSurchargeFactor,
    addDiscount,
    addTrip,
    createOrder,
    createInvoice,
    calculateTripPrice
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}