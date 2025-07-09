import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { settingsService } from '../services/settingsService'
import { tripService } from '../services/tripService'
import { orderService } from '../services/orderService'
import { invoiceService } from '../services/invoiceService'
import { authService } from '../services/authService'

// Crear el contexto
const AppContext = createContext()

// Hook personalizado para usar el contexto
export const useAppContext = () => useContext(AppContext)

// Proveedor del contexto
export const AppProvider = ({ children }) => {
  // Usuario actual
  const [currentUser, setCurrentUser] = useState(null)
  
  // Estado para las tarifas y configuraciones
  const [rateSettings, setRateSettings] = useState({
    distanceRate: 1.5, // Tarifa por distancia
    durationRate: 15, // Tarifa por duración
    surchargeFactors: [],
    discounts: []
  })

  // Estado para los viajes
  const [trips, setTrips] = useState([])

  // Estado para las órdenes y facturas
  const [orders, setOrders] = useState([])
  const [invoices, setInvoices] = useState([])
  
  // Estado para seguimiento de carga de datos
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Cargar usuario desde localStorage al iniciar y suscribirse a cambios de autenticación
  useEffect(() => {
    // Check if we have a saved session and restore it
    const user = authService.getCurrentUser()
    if (user) {
      setCurrentUser(user)
    }
    
    // Create a storage listener to handle session changes across tabs/windows
    const handleStorageChange = (e) => {
      if (e.key === 'jgex_user') {
        if (e.newValue) {
          try {
            const userData = JSON.parse(e.newValue)
            setCurrentUser(userData)
          } catch (err) {
            console.error('Error parsing user data from storage:', err)
          }
        } else {
          // User logged out in another tab
          setCurrentUser(null)
        }
      }
    }

    // Add event listener for storage changes
    window.addEventListener('storage', handleStorageChange)
    
    // Clean up event listener
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // Cargar configuraciones desde la API al iniciar
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Obtener configuraciones básicas
        const settings = await settingsService.getSettings()
        
        // Obtener factores de recargo
        const surchargeFactors = await settingsService.getSurchargeFactors()
        
        // Obtener descuentos
        const discounts = await settingsService.getDiscounts()
        
        // Actualizar estado con datos de la API
        setRateSettings({
          distanceRate: settings.distance_rate || 1.5,
          durationRate: settings.duration_rate || 15,
          surchargeFactors: surchargeFactors.map(sf => ({
            id: sf.id,
            name: sf.name,
            active: false,
            rate: sf.rate,
            type: sf.type
          })),
          discounts: discounts.map(d => ({
            id: d.id,
            name: d.name,
            active: false,
            rate: d.rate,
            type: d.type
          }))
        })
        
        setIsLoading(false)
      } catch (err) {
        console.error('Error al cargar configuraciones:', err)
        setError('Error al cargar las configuraciones. Por favor intente nuevamente.')
        setIsLoading(false)
      }
    }
    
    if (currentUser) {
      fetchSettings()
    }
  }, [currentUser])

  // Función para actualizar las tarifas
  const updateRateSettings = async (newSettings) => {
    try {
      // Actualizar configuraciones básicas en la API
      await settingsService.updateSettings({
        distance_rate: newSettings.distanceRate,
        duration_rate: newSettings.durationRate
      })
      
      // Actualizar estado local asegurando que todas las propiedades esenciales estén presentes
      setRateSettings(prev => ({
        ...prev, // Mantener valores anteriores como fallback
        distanceRate: newSettings.distanceRate || prev.distanceRate,
        durationRate: newSettings.durationRate || prev.durationRate,
        // Asegurar que surchargeFactors y discounts siempre sean arrays
        surchargeFactors: Array.isArray(newSettings.surchargeFactors) 
          ? newSettings.surchargeFactors 
          : (Array.isArray(prev.surchargeFactors) ? prev.surchargeFactors : []),
        discounts: Array.isArray(newSettings.discounts) 
          ? newSettings.discounts 
          : (Array.isArray(prev.discounts) ? prev.discounts : [])
      }))
      
      return true
    } catch (error) {
      console.error('Error al actualizar configuraciones:', error)
      throw error
    }
  }

  // Función para añadir un nuevo factor de recargo
  const addSurchargeFactor = async (factor) => {
    try {
      // Crear factor de recargo en la API
      const response = await settingsService.createSurchargeFactor({
        name: factor.name,
        rate: factor.rate,
        type: factor.type
      })
      
      // Actualizar estado local con ID real de la base de datos
      const newFactor = {
        id: response.id || response.surchargeFactorId,
        name: factor.name,
        active: false,
        rate: factor.rate,
        type: factor.type
      }
      
      setRateSettings(prev => ({
        ...prev,
        surchargeFactors: [...prev.surchargeFactors, newFactor]
      }))
      
      return newFactor
    } catch (error) {
      console.error('Error al añadir factor de recargo:', error)
      throw error
    }
  }

  // Función para añadir un nuevo descuento
  const addDiscount = async (discount) => {
    try {
      // Crear descuento en la API
      const response = await settingsService.createDiscount({
        name: discount.name,
        rate: discount.rate,
        type: discount.type
      })
      
      // Actualizar estado local con ID real de la base de datos
      const newDiscount = {
        id: response.id || response.discountId,
        name: discount.name,
        active: false,
        rate: discount.rate,
        type: discount.type
      }
      
      setRateSettings(prev => ({
        ...prev,
        discounts: [...prev.discounts, newDiscount]
      }))
      
      return newDiscount
    } catch (error) {
      console.error('Error al añadir descuento:', error)
      throw error
    }
  }

  // Función para añadir un nuevo viaje
  const addTrip = async (trip) => {
    try {
      // Formato para el backend
      const tripData = {
        user_id: currentUser.id,
        origin: trip.origin,
        destination: trip.destination,
        distance: trip.distance,
        duration: trip.duration || null,
        date: trip.date || new Date().toISOString(),
        price: trip.price,
        activeSurcharges: trip.activeSurcharges || []
      }
      
      // Crear viaje en la API
      const response = await tripService.createTrip(tripData)
      
      // Formato para frontend
      const newTrip = {
        id: response.tripId,
        ...trip,
        date: trip.date || new Date().toISOString()
      }
      
      // Actualizar estado local
      setTrips(prev => [...prev, newTrip])
      return newTrip
    } catch (error) {
      console.error('Error al añadir viaje:', error)
      throw error
    }
  }

  // Función para crear una nueva orden
  const createOrder = async (tripData) => {
    try {
      // Formato para el backend
      const orderData = {
        user_id: currentUser.id,
        total_amount: tripData.price,
        status: 'pending',
        items: [
          {
            trip_id: tripData.id,
            amount: tripData.price
          }
        ]
      }
      
      // Crear orden en la API
      const response = await orderService.createOrder(orderData)
      
      // Formato para frontend
      const newOrder = {
        id: response.orderId,
        date: new Date().toISOString(),
        tripData,
        status: 'pending'
      }
      
      // Actualizar estado local
      setOrders(prev => [...prev, newOrder])
      return newOrder
    } catch (error) {
      console.error('Error al crear orden:', error)
      throw error
    }
  }

  // Función para crear una nueva factura
  const createInvoice = async (orderId) => {
    try {
      const order = orders.find(o => o.id === orderId)
      if (!order) return null
      
      // Formato para el backend
      const invoiceData = {
        order_id: orderId,
        issue_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días después
        status: 'pending'
      }
      
      // Crear factura en la API
      const response = await invoiceService.createInvoice(invoiceData)
      
      // Formato para frontend
      const newInvoice = {
        id: response.invoiceId,
        invoiceNumber: response.invoiceNumber,
        date: new Date().toISOString(),
        orderId,
        orderData: order,
        status: 'issued' // issued, paid
      }
      
      // Actualizar estado local
      setInvoices(prev => [...prev, newInvoice])
      return newInvoice
    } catch (error) {
      console.error('Error al crear factura:', error)
      throw error
    }
  }
  
  // Función para iniciar sesión
  const login = async (username, password) => {
    try {
      const response = await authService.login(username, password)
      setCurrentUser(response.user)
      return response.user
    } catch (error) {
      console.error('Error al iniciar sesión:', error)
      throw error
    }
  }
  
  // Función para cerrar sesión
  const logout = () => {
    authService.logout()
    setCurrentUser(null)
    // Reiniciar estados
    setRateSettings({
      distanceRate: 1.5,
      durationRate: 15,
      surchargeFactors: [],
      discounts: []
    })
    setTrips([])
    setOrders([])
    setInvoices([])
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

  // Función para actualizar un factor de recargo
  const updateSurchargeFactor = async (id, updatedData) => {
    try {
      // Actualizar factor de recargo en la API
      await settingsService.updateSurchargeFactor(id, {
        name: updatedData.name,
        rate: updatedData.rate,
        type: updatedData.type
      })
      
      // Actualizar estado local con comprobación defensiva
      setRateSettings(prev => ({
        ...prev,
        surchargeFactors: Array.isArray(prev.surchargeFactors) 
          ? prev.surchargeFactors.map(factor => 
              factor.id === id ? { ...factor, ...updatedData } : factor
            )
          : [] // Si surchargeFactors no es un array, inicializarlo como array vacío
      }))
      
      return true
    } catch (error) {
      console.error('Error al actualizar factor de recargo:', error)
      throw error
    }
  }
  
  // Función para eliminar un factor de recargo
  const deleteSurchargeFactor = async (id) => {
    try {
      // Eliminar factor de recargo en la API
      await settingsService.deleteSurchargeFactor(id)
      
      // Actualizar estado local con comprobación defensiva
      setRateSettings(prev => ({
        ...prev,
        surchargeFactors: Array.isArray(prev.surchargeFactors) 
          ? prev.surchargeFactors.filter(factor => factor.id !== id)
          : [] // Si surchargeFactors no es un array, inicializarlo como array vacío
      }))
      
      return true
    } catch (error) {
      console.error('Error al eliminar factor de recargo:', error)
      throw error
    }
  }

  // Función para actualizar un descuento
  const updateDiscount = async (id, updatedData) => {
    try {
      // Actualizar descuento en la API
      await settingsService.updateDiscount(id, {
        name: updatedData.name,
        rate: updatedData.rate,
        type: updatedData.type
      })
      
      // Actualizar estado local con comprobación defensiva
      setRateSettings(prev => ({
        ...prev,
        discounts: Array.isArray(prev.discounts) 
          ? prev.discounts.map(discount => 
              discount.id === id ? { ...discount, ...updatedData } : discount
            )
          : [] // Si discounts no es un array, inicializarlo como array vacío
      }))
      
      return true
    } catch (error) {
      console.error('Error al actualizar descuento:', error)
      throw error
    }
  }
  
  // Función para eliminar un descuento
  const deleteDiscount = async (id) => {
    try {
      // Eliminar descuento en la API
      await settingsService.deleteDiscount(id)
      
      // Actualizar estado local con comprobación defensiva
      setRateSettings(prev => ({
        ...prev,
        discounts: Array.isArray(prev.discounts) 
          ? prev.discounts.filter(discount => discount.id !== id)
          : [] // Si discounts no es un array, inicializarlo como array vacío
      }))
      
      return true
    } catch (error) {
      console.error('Error al eliminar descuento:', error)
      throw error
    }
  }
  
  // Valor del contexto
  const value = {
    currentUser,
    rateSettings,
    trips,
    orders,
    invoices,
    isLoading,
    error,
    updateRateSettings,
    addSurchargeFactor,
    updateSurchargeFactor,
    addDiscount,
    updateDiscount,
    deleteSurchargeFactor,
    deleteDiscount,
    addTrip,
    createOrder,
    createInvoice,
    calculateTripPrice,
    login,
    logout
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}