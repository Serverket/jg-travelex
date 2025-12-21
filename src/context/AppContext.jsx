import { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { settingsService } from '../services/settingsService'
import { tripService } from '../services/tripService'
import { orderService } from '../services/orderService'
import { invoiceService } from '../services/invoiceService'
import { authService } from '../services/authService'

const ensureFeatureMap = (features) => {
  if (!features) return {}
  if (Array.isArray(features)) {
    return features.reduce((acc, key) => {
      if (typeof key === 'string') acc[key] = true
      return acc
    }, {})
  }
  if (typeof features === 'object') return features
  return {}
}

const normalizeUser = (rawUser) => {
  if (!rawUser) return null
  const featureMap = ensureFeatureMap(rawUser.features)
  return {
    ...rawUser,
    features: featureMap,
    is_temporary: !!rawUser.is_temporary,
    is_active: rawUser.is_active !== false,
    expires_at: rawUser.expires_at || null
  }
}

const isTemporaryExpired = (user) => {
  if (!user?.is_temporary || !user?.expires_at) return false
  try {
    const expires = new Date(user.expires_at)
    if (Number.isNaN(expires.getTime())) return false
    return expires < new Date()
  } catch {
    return false
  }
}

// Crear el contexto
export const AppContext = createContext()

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

  const userFeatures = useMemo(() => currentUser?.features || {}, [currentUser])

  const hasFeature = useCallback((featureKey) => {
    if (!featureKey) return false
    if (!currentUser) return false
    if (featureKey === 'dashboard') return true
    if (currentUser.role === 'admin') return true
    if (!userFeatures || Object.keys(userFeatures).length === 0) return true
    return !!userFeatures[featureKey]
  }, [currentUser, userFeatures])

  // Cargar usuario desde localStorage al iniciar y suscribirse a cambios de autenticación
  useEffect(() => {
    // Check if we have a saved session and restore it
    const cached = authService.getCachedUser()
    if (cached) {
      const normalizedUser = normalizeUser(cached)
      if (normalizedUser) {
        if (!normalizedUser.is_active) {
          setCurrentUser(null)
          setError('Tu cuenta está deshabilitada. Contacta al administrador.')
          authService.logout().catch(() => {})
        } else if (isTemporaryExpired(normalizedUser)) {
          setCurrentUser(null)
          setError('Tu acceso temporal ha expirado. Contacta al administrador para extenderlo.')
          authService.logout().catch(() => {})
        } else {
          setCurrentUser(normalizedUser)
          // Also load the user's data when restoring session
          loadUserData(normalizedUser.id).catch(_err => {
            setError('Error loading user data')
          })
        }
      }
    }
    
    // Create a storage listener to handle session changes across tabs/windows
    const handleStorageChange = (e) => {
      if (e.key === 'jgex_user') {
        if (e.newValue) {
          try {
            const userData = normalizeUser(JSON.parse(e.newValue))
            if (userData) {
              if (!userData.is_active) {
                setCurrentUser(null)
                setError('Tu cuenta está deshabilitada. Contacta al administrador.')
                authService.logout().catch(() => {})
              } else if (isTemporaryExpired(userData)) {
                setCurrentUser(null)
                setError('Tu acceso temporal ha expirado. Contacta al administrador para extenderlo.')
                authService.logout().catch(() => {})
              } else {
                setCurrentUser(userData)
              }
            }
          } catch (err) {
            setError('Invalid user session data')
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
  }

  // Helper: generate a short, unique-ish code (<= 20 chars)
  const generateCode = (name, fallbackPrefix) => {
    const base = (name || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
    const prefix = (base.slice(0, 8) || (fallbackPrefix || 'ITEM'))
    const random = Math.random().toString(36).toUpperCase().slice(2, 8) // 6 chars
    const time = Date.now().toString(36).toUpperCase().slice(-4) // 4 chars
    const code = `${prefix}${random}${time}`
    return code.slice(0, 20)
  }

  // Función para añadir un nuevo factor de recargo
  const addSurchargeFactor = async (factor) => {
    
      // Crear factor de recargo en la API con generación de código y reintentos por unicidad
      let attempts = 0
      let lastError = null
      let response = null
      while (attempts < 3) {
        const code = generateCode(factor.name, 'SF')
        try {
          response = await settingsService.createSurchargeFactor({
            name: factor.name,
            rate: Number(factor.rate),
            type: factor.type,
            code
          })
          break
        } catch (err) {
          const msg = (err && (err.message || err.error || '')) + ''
          // 23505 is Postgres unique_violation
          if (err?.code === '23505' || /duplicate key|unique constraint/i.test(msg)) {
            attempts++
            if (attempts < 3) {
              console.warn('Duplicate code detected for surcharge factor, retrying with a new code (attempt', attempts + 1, 'of 3)')
            }
            lastError = err
            continue
          }
          throw err
        }
      }
      if (!response) throw lastError || new Error('No se pudo crear el factor de recargo')
      
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
  }

  // Función para añadir un nuevo descuento
  const addDiscount = async (discount) => {
    
      // Crear descuento en la API con generación de código y reintentos por unicidad
      let attempts = 0
      let lastError = null
      let response = null
      while (attempts < 3) {
        const code = generateCode(discount.name, 'DS')
        try {
          response = await settingsService.createDiscount({
            name: discount.name,
            rate: Number(discount.rate),
            type: discount.type,
            code
          })
          break
        } catch (err) {
          const msg = (err && (err.message || err.error || '')) + ''
          if (err?.code === '23505' || /duplicate key|unique constraint/i.test(msg)) {
            attempts++
            if (attempts < 3) {
              console.warn('Duplicate code detected for discount, retrying with a new code (attempt', attempts + 1, 'of 3)')
            }
            lastError = err
            continue
          }
          throw err
        }
      }
      if (!response) throw lastError || new Error('No se pudo crear el descuento')
      
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
  }

  // Función para añadir un nuevo viaje
  const addTrip = async (trip) => {
    
      // Ensure all required fields are present and properly formatted
      if (!currentUser || !currentUser.id) {
        throw new Error('Usuario no autenticado');
      }
      
      // Format tripData with all required fields and proper data types
      // Format the date as YYYY-MM-DD for MySQL DATE field
      const formatDateForMySQL = (dateStr) => {
        const date = dateStr ? new Date(dateStr) : new Date();
        return date.toISOString().split('T')[0]; // Get YYYY-MM-DD part
      };
      
      // Normalize fields to backend schema
      const originDescription = typeof trip.origin === 'string' ? trip.origin : (trip?.origin?.description || 'Origen no especificado');
      const destinationDescription = typeof trip.destination === 'string' ? trip.destination : (trip?.destination?.description || 'Destino no especificado');
      const tripDate = formatDateForMySQL(trip.date);
      const distanceMiles = typeof trip.distance === 'number' ? trip.distance : parseFloat(trip.distance) || 0;
      const durationMinutes = Math.round(((typeof trip.duration === 'number' ? trip.duration : parseFloat(trip.duration)) || 0) * 60);

      const tripData = {
        origin_address: originDescription,
        destination_address: destinationDescription,
        ...(trip?.origin_lat != null && trip?.origin_lng != null
          ? { origin_lat: trip.origin_lat, origin_lng: trip.origin_lng }
          : (trip?.origin?.lat != null && trip?.origin?.lng != null
            ? { origin_lat: trip.origin.lat, origin_lng: trip.origin.lng }
            : {})),
        ...(trip?.destination_lat != null && trip?.destination_lng != null
          ? { destination_lat: trip.destination_lat, destination_lng: trip.destination_lng }
          : (trip?.destination?.lat != null && trip?.destination?.lng != null
            ? { destination_lat: trip.destination.lat, destination_lng: trip.destination.lng }
            : {})),
        distance_miles: distanceMiles,
        distance_km: Number((distanceMiles * 1.60934).toFixed(2)),
        duration_minutes: durationMinutes,
        trip_date: tripDate,
        base_price: (trip?.base_price != null)
          ? Number(trip.base_price)
          : (trip?.price != null ? Number(trip.price) : 0),
        surcharges: 0,
        discounts: 0,
        final_price: (trip?.price != null ? Number(trip.price) : undefined) ?? ((trip?.base_price != null ? Number(trip.base_price) : undefined) ?? 0)
      };
      
      // Crear viaje en la API
      const response = await tripService.createTrip(tripData)
      
      // Formato para frontend
      const newTrip = {
        id: response.id,
        ...trip,
        date: (response?.trip_date ? new Date(response.trip_date).toISOString() : (trip.date || new Date().toISOString()))
      }
      
      // Actualizar estado local - verificar si el viaje ya existe para evitar duplicados
      setTrips(prev => {
        // Check if this trip already exists (by ID)
        const tripExists = prev.some(t => t.id === newTrip.id)
        
        if (tripExists) {
          // If exists, replace it
          return prev.map(t => t.id === newTrip.id ? newTrip : t)
        } else {
          // If new, append it
          return [...prev, newTrip]
        }
      })
      return newTrip
  }

  // Función para crear una nueva orden
  const createOrder = async (tripData) => {
    
      // Verificamos si el viaje ya está guardado en la base de datos
      let tripId = tripData.id;
      
      // Si el viaje no tiene ID, creamos un nuevo viaje primero
      if (!tripId) {
        const savedTrip = await addTrip(tripData);
        tripId = savedTrip.id;
      }
      
      // Formato para el backend
      const orderData = {
        user_id: currentUser.id,
        total_amount: tripData.price,
        status: 'pending',
        items: [
          {
            trip_id: tripId,
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
        tripData: {...tripData, id: tripId}, // Aseguramos que tripData tenga el ID correcto
        status: 'pending'
      }
      
      // Actualizar estado local con verificación de duplicados
      setOrders(prev => {
        // Check if this order already exists (by ID)
        const orderExists = prev.some(o => o.id === newOrder.id)
        
        if (orderExists) {
          // If exists, replace it
          return prev.map(o => o.id === newOrder.id ? newOrder : o)
        } else {
          // If new, append it
          return [...prev, newOrder]
        }
      })
      return newOrder
  }

  // Función para crear una nueva factura
  const createInvoice = async (orderId) => {
    
      
      // First check with the API if an invoice already exists for this order
      try {
        const existingInvoiceResponse = await invoiceService.getInvoiceByOrderId(orderId);
        if (existingInvoiceResponse && existingInvoiceResponse.id) {
          // Add the found invoice to our local state if it's not there already
          const invoiceExists = invoices.some(inv => inv.id === existingInvoiceResponse.id);
          if (!invoiceExists) {
            setInvoices(prev => [...prev, {
              ...existingInvoiceResponse,
              orderId: orderId,
              orderData: orders.find(o => o.id === orderId)
            }]);
          }
          return existingInvoiceResponse;
        }
      } catch (checkError) {
        // Check if this is a 404 error (meaning no invoice exists yet)
        if (checkError.message && checkError.message.includes('Error 404')) {
          // This is normal - continue with creation
        } else {
          throw checkError;
        }
      }
      
      // As a backup, also check local state
      const localExistingInvoice = invoices.find(inv => inv.orderId === orderId);
      if (localExistingInvoice) {
        return localExistingInvoice;
      }

      const order = orders.find(o => o.id === orderId);
      if (!order) {
        return null;
      }
      
      // Format dates properly for the backend
      const currentDate = new Date();
      const dueDate = new Date(currentDate);
      dueDate.setDate(dueDate.getDate() + 30); // 30 days later
      
      // Format for the backend - use YYYY-MM-DD format to avoid timezone issues
      const invoiceData = {
        order_id: orderId,
        invoice_date: currentDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending'
      }
      
      
      try {
        // Create invoice via API
        const response = await invoiceService.createInvoice(invoiceData);
        
        // Format for frontend
        const newInvoice = {
          id: response.invoiceId,
          invoiceNumber: response.invoiceNumber,
          date: currentDate.toISOString(),
          orderId,
          orderData: order,
          status: 'issued' // issued, paid
        }
        
        // Update local state
        setInvoices(prev => [...prev, newInvoice]);
        return newInvoice;
      } catch (apiError) {
        
        // Check for specific error: invoice already exists
        if (apiError.response?.status === 400 && 
            apiError.response?.data?.message?.includes('Invoice already exists')) {
          // Try to fetch the existing invoice
          try {
            const existingInv = await invoiceService.getInvoiceByOrderId(orderId);
            if (existingInv) {
              return existingInv;
            }
          } catch (fetchError) {
            // Ignore fetch error
          }
        }
        
        throw apiError;
      }
  }
  
  // Función para iniciar sesión
  const login = async (username, password) => {
    
      const response = await authService.login(username, password)
      const normalized = normalizeUser(response.user)

      if (!normalized) {
        throw new Error('No se pudo cargar el perfil del usuario')
      }

      if (!normalized.is_active) {
        await authService.logout()
        setCurrentUser(null)
        throw new Error('Tu cuenta está deshabilitada. Contacta al administrador.')
      }

      if (isTemporaryExpired(normalized)) {
        await authService.logout()
        setCurrentUser(null)
        throw new Error('Tu acceso temporal ha expirado. Contacta al administrador para extenderlo.')
      }

      setCurrentUser(normalized)
      
      // Load user data after successful login
      if (normalized.id) {
        await loadUserData(normalized.id)
      }
      
      return normalized
  }
  
  // Función para cargar datos del usuario
  const loadUserData = async (userId) => {
    try {
      // Cargar viajes del usuario
      const userTrips = await tripService.getTripsByUserId(userId)
      setTrips(userTrips) // Replace, don't append
      
      // Cargar órdenes del usuario
      const userOrders = await orderService.getOrdersByUserId(userId)
      setOrders(userOrders) // Replace, don't append
      
      // Cargar todas las facturas (filtraremos las del usuario después)
      const allInvoices = await invoiceService.getAllInvoices()
      const orderIds = userOrders.map(order => order.id)
      const userInvoices = allInvoices.filter(invoice => orderIds.includes(invoice.order_id))
      setInvoices(userInvoices) // Replace, don't append
      
      return { trips: userTrips, orders: userOrders, invoices: userInvoices }
    } catch (error) {
      return { trips: [], orders: [], invoices: [] }
    }
  }

  const refreshCurrentUser = useCallback(async () => {
    try {
      const fetched = await authService.getCurrentUser()
      if (!fetched) {
        setCurrentUser(null)
        return null
      }

      const normalized = normalizeUser(fetched)
      if (!normalized) {
        setCurrentUser(null)
        return null
      }

      if (!normalized.is_active) {
        await authService.logout()
        setCurrentUser(null)
        setError('Tu cuenta está deshabilitada. Contacta al administrador.')
        return null
      }

      if (isTemporaryExpired(normalized)) {
        await authService.logout()
        setCurrentUser(null)
        setError('Tu acceso temporal ha expirado. Contacta al administrador para extenderlo.')
        return null
      }

      setCurrentUser(normalized)
      if (normalized.id) {
        await loadUserData(normalized.id)
      }
      return normalized
    } catch (err) {
      setError('No se pudo actualizar la sesión del usuario')
      return null
    }
  }, [])
  
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
    setError(null)
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
    // Backward/compat aliases
    user: currentUser,
    userFeatures,
    hasFeature,
    rateSettings,
    trips,
    orders,
    invoices,
    isLoading,
    error,
    refreshCurrentUser,
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
    logout,
    // Export state setters for direct updates from components
    setOrders,
    setInvoices,
    setTrips,
    // Allow components like Login to set user directly (with normalization)
    setUser: (user) => setCurrentUser(normalizeUser(user))
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}