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
      // Also load the user's data when restoring session
      loadUserData(user.id).catch(err => {
        console.error('Error loading user data on session restore:', err)
      })
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
      
      const tripData = {
        user_id: currentUser.id,
        origin: trip.origin || 'Origen no especificado',
        destination: trip.destination || 'Destino no especificado',
        // Ensure distance is a valid number
        distance: typeof trip.distance === 'number' ? trip.distance : parseFloat(trip.distance) || 0,
        // Ensure duration is a valid number or null
        duration: trip.duration ? (typeof trip.duration === 'number' ? trip.duration : parseFloat(trip.duration)) : null,
        // Format date as YYYY-MM-DD for MySQL DATE field
        date: formatDateForMySQL(trip.date),
        // Ensure price is a valid number
        price: typeof trip.price === 'number' ? trip.price : parseFloat(trip.price) || 0,
        // Ensure activeSurcharges is a simple array of numbers (not objects)
        // Backend expects surcharge IDs as integers
        activeSurcharges: Array.isArray(trip.activeSurcharges) ?
          trip.activeSurcharges
            .map(id => typeof id === 'number' ? id : parseInt(id))
            .filter(id => !isNaN(id)) : // Filter out any NaN values
          []
      }
      
      console.log('Enviando datos de viaje al backend:', tripData);
      
      // Crear viaje en la API
      const response = await tripService.createTrip(tripData)
      console.log('Respuesta de la API al crear viaje:', response);
      
      // Formato para frontend
      const newTrip = {
        id: response.tripId,
        ...trip,
        date: trip.date || new Date().toISOString()
      }
      
      console.log('Nuevo viaje creado:', newTrip);
      
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
    } catch (error) {
      console.error('Error al añadir viaje:', error)
      throw error
    }
  }

  // Función para crear una nueva orden
  const createOrder = async (tripData) => {
    try {
      // Verificamos si el viaje ya está guardado en la base de datos
      let tripId = tripData.id;
      
      // Si el viaje no tiene ID, creamos un nuevo viaje primero
      if (!tripId) {
        console.log('El viaje no tiene ID, creando un nuevo viaje primero...');
        const savedTrip = await addTrip(tripData);
        tripId = savedTrip.id;
        console.log('Viaje guardado con ID:', tripId);
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
      
      console.log('Enviando datos de orden al backend:', orderData);
      
      // Crear orden en la API
      const response = await orderService.createOrder(orderData)
      console.log('Respuesta de la API al crear orden:', response);
      
      // Formato para frontend
      const newOrder = {
        id: response.orderId,
        date: new Date().toISOString(),
        tripData: {...tripData, id: tripId}, // Aseguramos que tripData tenga el ID correcto
        status: 'pending'
      }
      
      console.log('Nueva orden creada:', newOrder);
      
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
    } catch (error) {
      console.error('Error al crear orden:', error)
      throw error
    }
  }

  // Función para crear una nueva factura
  const createInvoice = async (orderId) => {
    try {
      console.log('Starting invoice creation for order ID:', orderId);
      
      // First check with the API if an invoice already exists for this order
      try {
        const existingInvoiceResponse = await invoiceService.getInvoiceByOrderId(orderId);
        if (existingInvoiceResponse && existingInvoiceResponse.id) {
          console.log('API check: Invoice already exists for this order:', existingInvoiceResponse);
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
          console.log('No existing invoice found for order ID:', orderId, '(404 response is expected)');
          // This is normal - continue with creation
        } else {
          // For any other error type, log and throw
          console.error('Error checking for existing invoice:', checkError);
          throw checkError;
        }
      }
      
      // As a backup, also check local state
      const localExistingInvoice = invoices.find(inv => inv.orderId === orderId);
      if (localExistingInvoice) {
        console.log('Local state check: Invoice already exists for this order:', localExistingInvoice);
        return localExistingInvoice;
      }

      const order = orders.find(o => o.id === orderId);
      if (!order) {
        console.error('Order not found for ID:', orderId, 'in orders array:', orders);
        return null;
      }
      
      // Format dates properly for the backend
      const currentDate = new Date();
      const dueDate = new Date(currentDate);
      dueDate.setDate(dueDate.getDate() + 30); // 30 days later
      
      // Format for the backend - use YYYY-MM-DD format to avoid timezone issues
      const invoiceData = {
        order_id: orderId,
        issue_date: currentDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending'
      }
      
      console.log('Creating invoice with data:', JSON.stringify(invoiceData, null, 2));
      
      try {
        // Create invoice via API
        const response = await invoiceService.createInvoice(invoiceData);
        console.log('Invoice created successfully:', response);
        
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
        console.error('API Error details:', apiError);
        console.error('API Error response:', apiError.response?.data || 'No response data');
        
        // Check for specific error: invoice already exists
        if (apiError.response?.status === 400 && 
            apiError.response?.data?.message?.includes('Invoice already exists')) {
          // Try to fetch the existing invoice
          try {
            const existingInv = await invoiceService.getInvoiceByOrderId(orderId);
            if (existingInv) {
              console.log('Found existing invoice after 400 error:', existingInv);
              return existingInv;
            }
          } catch (fetchError) {
            console.error('Failed to fetch existing invoice after 400 error:', fetchError);
          }
        }
        
        throw apiError;
      }
    } catch (error) {
      console.error('Error al crear factura:', error);
      throw error;
    }
  }
  
  // Función para iniciar sesión
  const login = async (username, password) => {
    try {
      const response = await authService.login(username, password)
      setCurrentUser(response.user)
      
      // Load user data after successful login
      if (response.user && response.user.id) {
        await loadUserData(response.user.id)
      }
      
      return response.user
    } catch (error) {
      console.error('Error al iniciar sesión:', error)
      throw error
    }
  }
  
  // Función para cargar datos del usuario
  const loadUserData = async (userId) => {
    try {
      console.log('Loading user data for ID:', userId)
      
      // Cargar viajes del usuario
      const userTrips = await tripService.getTripsByUserId(userId)
      console.log('User trips loaded:', userTrips)
      setTrips(userTrips) // Replace, don't append
      
      // Cargar órdenes del usuario
      const userOrders = await orderService.getOrdersByUserId(userId)
      console.log('User orders loaded:', userOrders)
      setOrders(userOrders) // Replace, don't append
      
      // Cargar todas las facturas (filtraremos las del usuario después)
      const allInvoices = await invoiceService.getAllInvoices()
      const orderIds = userOrders.map(order => order.id)
      const userInvoices = allInvoices.filter(invoice => orderIds.includes(invoice.order_id))
      console.log('User invoices loaded:', userInvoices)
      setInvoices(userInvoices) // Replace, don't append
      
      return { trips: userTrips, orders: userOrders, invoices: userInvoices }
    } catch (error) {
      console.error('Error loading user data:', error)
      return { trips: [], orders: [], invoices: [] }
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
    logout,
    // Export state setters for direct updates from components
    setOrders,
    setInvoices,
    setTrips
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}