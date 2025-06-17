import { createContext, useContext, useState, useEffect, useRef } from 'react'

// Crear el contexto
const AppContext = createContext()

// Hook personalizado para usar el contexto
export const useAppContext = () => useContext(AppContext)

// Proveedor del contexto
export const AppProvider = ({ children }) => {
  // Estado para las tarifas y configuraciones
  const [rateSettings, setRateSettings] = useState({
    distanceRate: 1.5, // Tarifa por distancia
    durationRate: 15, // Tarifa por duración
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

  const rateSettingsRef = useRef(rateSettings);
  
  useEffect(() => {
    rateSettingsRef.current = rateSettings;
  }, [rateSettings]);

  // Función para calcular el precio de un viaje
  const calculateTripPrice = (distance, duration, activeSurcharges, activeDiscounts) => {
    const rs = rateSettingsRef.current;
    console.log('Current rate settings:', rs);
    // Start from 0
    let basePrice = 0;
    
    // Apply distance rate
    basePrice += distance * rs.distanceRate;
    
    // Apply duration rate
    basePrice += duration * rs.durationRate;
    
    // Apply surcharges
    activeSurcharges.forEach(id => {
      const factor = rs.surchargeFactors.find(f => f.id === id);
      if (factor) {
        if (factor.type === 'percentage') {
          basePrice *= (1 + factor.rate / 100);
        } else {
          basePrice += factor.rate;
        }
      }
    });
    
    // Apply discounts
    activeDiscounts.forEach(id => {
      const discount = rs.discounts.find(d => d.id === id);
      if (discount) {
        if (discount.type === 'percentage') {
          basePrice *= (1 - discount.rate / 100);
        } else {
          basePrice -= discount.rate;
        }
      }
    });
    
    return basePrice.toFixed(2);
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