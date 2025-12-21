import { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../context/AppContext'
import { GoogleMap, useJsApiLoader, DirectionsRenderer } from '@react-google-maps/api'
import PlaceSearch from '../components/PlaceSearch'
import OpenStreetMap from '../components/OpenStreetMap'
import ManualDistanceInput from '../components/ManualDistanceInput'
import { tripService } from '../services/tripService'
import { orderService } from '../services/orderService'
import { settingsService } from '../services/settingsService'
import { backendService } from '../services/backendService'
import { useToast } from '../context/ToastContext'

const libraries = ['places']

const DistanceCalculator = () => {
  const {
    calculateTripPrice: _calculateTripPrice,
    addTrip: _addTrip,
    createOrder: _createOrder,
    currentUser
  } = useAppContext()
  const toast = useToast()
  // Ensure we have a user reference
  const activeUser = currentUser
  const [_rateSettings, setRateSettings] = useState(null)
  const [surchargeFactors, setSurchargeFactors] = useState([])
  const [discounts, setDiscounts] = useState([])
  
  // Estado para el método de cálculo seleccionado
  const [calculationMethod, setCalculationMethod] = useState('manual') // 'manual', 'google'
  
  // Estado para Google Maps
  const [origin, setOrigin] = useState(null)
  const [destination, setDestination] = useState(null)
  const [directions, setDirections] = useState(null)
  
  // Estado común para todos los métodos
  const [distance, setDistance] = useState(null)
  const [duration, setDuration] = useState(null)
  const [price, setPrice] = useState(null)
  const [quoteBreakdown, setQuoteBreakdown] = useState(null)
  const [activeSurcharges, setActiveSurcharges] = useState([])
  const [activeDiscounts, setActiveDiscounts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [orderCreated, setOrderCreated] = useState(false)
  const [center, setCenter] = useState({ lat: 37.7749, lng: -122.4194 }) // San Francisco por defecto
  const lastTripRef = useRef(null)
  const surfacePanelClass = 'rounded-3xl border border-white/10 bg-white/5 shadow-xl shadow-blue-950/20 backdrop-blur-lg'

  const subtlePanelClass = 'rounded-2xl border border-white/10 bg-white/5'

  const chipClass = 'rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-blue-100/80 shadow-lg shadow-blue-950/20'

  // Cargar la API de Google Maps
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  })

  // Verificar si la API key de Google Maps está disponible
  const googleMapsApiKeyAvailable = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [settings, surcharges, discountsList] = await Promise.all([
          settingsService.getSettings(),
          settingsService.getSurchargeFactors(),
          settingsService.getDiscounts()
        ])
        
        setRateSettings(settings || { distance_rate: 2, duration_rate: 0.5 })
        setSurchargeFactors(surcharges || [])
        setDiscounts(discountsList || [])
      } catch (error) {
        console.error('Error loading settings:', error)
        // Set default values if loading fails
        setRateSettings({ distance_rate: 2, duration_rate: 0.5 })
      }
    }

    loadSettings()
  }, [])

  // Efecto para establecer el método de cálculo predeterminado según la disponibilidad de la API key
  useEffect(() => {
    if (!googleMapsApiKeyAvailable) {
      setCalculationMethod('manual') // Default to manual calculation
    }
  }, [googleMapsApiKeyAvailable])

  // Recalculate price via backend when inputs change
  useEffect(() => {
    const fetchQuote = async () => {
      try {
        // Handle different calculation types for backend
        const quoteData = {
          distance: distance ? parseFloat(distance) : 0,
          duration: duration ? parseFloat(duration) : 0, 
          surcharges: activeSurcharges,
          discounts: activeDiscounts,
        };
        
        console.log('Sending quote request:', quoteData);
        
        const { price: quotedPrice, breakdown } = await backendService.getQuote(quoteData);
        setPrice(quotedPrice)
        setQuoteBreakdown(breakdown)
        setError('')
      } catch (err) {
        console.error('Error fetching quote:', err)
        setError('Error al calcular el precio')
      }
    }
    
    // Only fetch quote if we have at least distance OR duration
    if (distance || duration) {
      fetchQuote()
    }
  }, [activeSurcharges, activeDiscounts, distance, duration])

  // Manejar selección de origen en Google Maps
  const handleOriginSelect = (place) => {
    setOrigin(place)
  }

  // Manejar selección de destino en Google Maps
  const handleDestinationSelect = (place) => {
    setDestination(place)
  }

  // Calcular la ruta con Google Maps
  const calculateGoogleRoute = async () => {
    if (!origin || !destination) {
      setError('Por favor ingrese origen y destino')
      return
    }

    setIsLoading(true)
    setError('')
    setDirections(null)
    setDistance(null)
    setDuration(null)
    setPrice(null)
    setOrderCreated(false)

    try {
      const directionsService = new window.google.maps.DirectionsService()
      const results = await directionsService.route({
        origin: new window.google.maps.LatLng(origin.lat, origin.lng),
        destination: new window.google.maps.LatLng(destination.lat, destination.lng),
        travelMode: window.google.maps.TravelMode.DRIVING,
      })

      setDirections(results)

      // Extraer distancia y duración
      const distanceInMiles = results.routes[0].legs[0].distance.value / 1609.34 // Convertir metros a millas
      const durationInSeconds = results.routes[0].legs[0].duration.value
      const durationInHours = durationInSeconds / 3600 // Convertir segundos a horas

      setDistance(distanceInMiles.toFixed(2))
      setDuration(durationInHours.toFixed(2))

      // Centrar el mapa en el punto medio de la ruta
      const bounds = results.routes[0].bounds
      const center = {
        lat: (bounds.getNorthEast().lat() + bounds.getSouthWest().lat()) / 2,
        lng: (bounds.getNorthEast().lng() + bounds.getSouthWest().lng()) / 2,
      }
      setCenter(center)
    } catch (error) {
      console.error('Error calculando la ruta:', error)
      setError('Error al calcular la ruta. Por favor verifique las direcciones e intente nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  // Manejar entrada manual de distancia y duración
  const handleManualCalculation = (data) => {
    setOrigin(data.origin)
    setDestination(data.destination)
    setDistance(data.distance)
    setDuration(data.duration)
    
    // Log the calculation type for debugging
    console.log('Manual calculation type:', data.calculationType)
  }

  // Manejar cambios en los recargos
  const handleSurchargeChange = (id) => {
    setActiveSurcharges(prev => {
      const newSurcharges = prev.includes(id) 
        ? prev.filter(surchargeId => surchargeId !== id)
        : [...prev, id];
      
      return newSurcharges;
    });
  }

  // Manejar cambios en los descuentos
  const handleDiscountChange = (id) => {
    setActiveDiscounts(prev => {
      const newDiscounts = prev.includes(id) 
        ? prev.filter(discountId => discountId !== id)
        : [...prev, id];
      
      return newDiscounts;
    });
  }

  // Derive a lightweight fingerprint so we can reuse the last trip instead of duplicating it
  const createTripSignature = (payload) => JSON.stringify({
    origin: payload.origin_address || '',
    destination: payload.destination_address || '',
    distance: Number(payload.distance_miles ?? 0).toFixed(2),
    duration: Number(payload.duration_minutes ?? 0),
    date: payload.trip_date || '',
    price: Number(payload.final_price ?? 0).toFixed(2)
  })

  const buildTripPayload = () => {
    if (!currentUser || !currentUser.id) {
      setError('Debe iniciar sesión para guardar el viaje')
      return null
    }

    const originDescription = origin 
      ? (typeof origin === 'string' ? origin : origin.description)
      : 'Origen no especificado'
      
    const destinationDescription = destination
      ? (typeof destination === 'string' ? destination : destination.description)
      : 'Destino no especificado'

    const today = new Date()
    const tripDate = today.toISOString().split('T')[0]
    const distanceMiles = Number(distance || 0)
    const durationMinutes = duration ? Math.round(Number(duration) * 60) : 0

    return {
      origin_address: originDescription,
      destination_address: destinationDescription,
      ...(origin && origin.lat != null && origin.lng != null ? { 
        origin_lat: origin.lat, 
        origin_lng: origin.lng 
      } : {
        origin_lat: 0,
        origin_lng: 0
      }),
      ...(destination && destination.lat != null && destination.lng != null ? { 
        destination_lat: destination.lat, 
        destination_lng: destination.lng 
      } : {
        destination_lat: 0,
        destination_lng: 0
      }),
      distance_miles: distanceMiles,
      distance_km: Number((distanceMiles * 1.60934).toFixed(2)),
      duration_minutes: durationMinutes,
      trip_date: tripDate,
      base_price: quoteBreakdown?.base !== undefined ? Number(quoteBreakdown.base) : 0,
      surcharges: Array.isArray(quoteBreakdown?.surcharges)
        ? quoteBreakdown.surcharges.reduce((sum, s) => sum + Number(s.amount || 0), 0)
        : 0,
      discounts: Array.isArray(quoteBreakdown?.discounts)
        ? quoteBreakdown.discounts.reduce((sum, d) => sum + Number(d.amount || 0), 0)
        : 0,
      final_price: price != null ? Number(price) : 0
    }
  }

  // Persist trip by updating the most recent entry when the form submission matches the prior one
  const persistTrip = async (tripPayload) => {
    const signature = createTripSignature(tripPayload)
    const lastTrip = lastTripRef.current

    if (lastTrip && lastTrip.signature === signature && lastTrip.id) {
      const updatedTrip = await tripService.updateTrip(lastTrip.id, tripPayload)
      lastTripRef.current = { id: updatedTrip.id, signature }
      return { trip: updatedTrip, wasNew: false }
    }

    const savedTrip = await tripService.createTrip(tripPayload)
    lastTripRef.current = { id: savedTrip.id, signature }
    return { trip: savedTrip, wasNew: true }
  }

  const applyBreakdownToTrip = async (tripId, isNew) => {
    if (!isNew || !tripId) return

    if (quoteBreakdown?.surcharges?.length) {
      await Promise.all(
        quoteBreakdown.surcharges.map(s =>
          tripService.addSurcharge(tripId, s.id, s.amount)
        )
      )
    }

    if (quoteBreakdown?.discounts?.length) {
      await Promise.all(
        quoteBreakdown.discounts.map(d =>
          tripService.addDiscount(tripId, d.id, d.amount)
        )
      )
    }
  }

  // Guardar el viaje
  const saveTrip = async () => {
    if (!distance && !duration) {
      setError('Primero debe ingresar distancia o duración')
      return
    }

    try {
      const tripPayload = buildTripPayload()
      if (!tripPayload) return

      const { trip: savedTrip, wasNew } = await persistTrip(tripPayload)
      await applyBreakdownToTrip(savedTrip.id, wasNew)
      
      setError('')
      toast.success(wasNew ? 'Viaje guardado correctamente' : 'Viaje actualizado sin duplicados')
    } catch (error) {
      console.error('Error saving trip:', error)
      setError('Error al guardar el viaje')
    }
  }

  // Crear una orden
  const createTripOrder = async () => {
    if ((!distance && !duration) || !price) {
      setError('Primero debe calcular una ruta')
      return
    }

    try {
      const tripPayload = buildTripPayload()
      if (!tripPayload) return

      const { trip: persistedTrip, wasNew } = await persistTrip(tripPayload)
      await applyBreakdownToTrip(persistedTrip.id, wasNew)
      
      // Create order
      if (!activeUser?.id) {
        throw new Error('Usuario no autenticado');
      }
      
      const orderData = {
        user_id: activeUser.id,
        status: 'pending',
        subtotal: parseFloat(price),
        total_amount: parseFloat(price)
      }
      
      console.log('Creating order with data:', orderData);
      const createdOrder = await orderService.createOrder(orderData)
      console.log('Order created:', createdOrder);
      
      // Create order item linked to the trip
      const orderItemData = {
        order_id: createdOrder.id,
        trip_id: persistedTrip.id,
        amount: parseFloat(price)
      };
      console.log('Creating order item with data:', orderItemData);
      const createdOrderItem = await orderService.createOrderItem(orderItemData);
      console.log('Order item created:', createdOrderItem);
      
      // Update global context state immediately
      const newOrder = {
        id: createdOrder.id,
        user_id: activeUser.id,
        status: 'pending',
        total_amount: parseFloat(price),
        created_at: new Date().toISOString(),
        items: [createdOrderItem],
        tripData: persistedTrip
      };
      
      // Order created successfully
      console.log('Order created successfully', newOrder)
      setOrderCreated(true)
      setError('')
      toast.success('La orden ha sido creada con éxito')
    } catch (error) {
      console.error('Error al crear la orden:', error)
      setError('Error al crear la orden')
    }
  }

  // Limpiar el formulario
  const clearForm = () => {
    setOrigin(null);
    setDestination(null);
    setDirections(null);
    setDistance(null);
    setDuration(null);
    setPrice(null);
    setQuoteBreakdown(null);
    setActiveSurcharges([]);
    setActiveDiscounts([]);
    setError('');
    setOrderCreated(false);
    setCalculationMethod('manual');
  }

  // Renderizar el método de cálculo seleccionado
  const renderCalculationMethod = () => {
    switch (calculationMethod) {
      case 'manual':
        return (
          <ManualDistanceInput onCalculate={handleManualCalculation} />
        )
      case 'google':
        if (!isLoaded) {
          return (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-blue-100/80">
              Cargando Google Maps...
            </div>
          )
        }
        return (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-blue-100/90">Origen</label>
              <PlaceSearch 
                placeholder="Ingrese dirección de origen" 
                onPlaceSelect={handleOriginSelect} 
              />
            </div>
            
            <div>
              <label className="mb-1 block text-sm font-semibold text-blue-100/90">Destino</label>
              <PlaceSearch 
                placeholder="Ingrese dirección de destino" 
                onPlaceSelect={handleDestinationSelect} 
              />
            </div>
            
            <button
              onClick={calculateGoogleRoute}
              disabled={isLoading || !origin || !destination}
              className="w-full rounded-full border border-white/10 bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:bg-blue-500/40"
            >
              {isLoading ? 'Calculando...' : 'Calcular Ruta'}
            </button>
          </div>
        )
      default:
        return null
    }
  }

  // Renderizar el mapa según el método seleccionado
  const renderMap = () => {
    switch (calculationMethod) {
      case 'google':
        if (!isLoaded) return null
        return (
          <div className="h-96 w-full rounded overflow-hidden">
            <GoogleMap
              center={center}
              zoom={10}
              mapContainerStyle={{ width: '100%', height: '100%' }}
              options={{
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: true,
              }}
            >
              {directions && (
                <DirectionsRenderer
                  directions={directions}
                  options={{
                    polylineOptions: {
                      strokeColor: '#1E40AF',
                      strokeWeight: 5,
                    },
                  }}
                />
              )}
            </GoogleMap>
          </div>
        )
      case 'manual':
        // Mostrar mapa solo si ambos lugares están seleccionados y tienen lat/lng
        if (origin && destination && origin.lat && origin.lng && destination.lat && destination.lng) {
          return (
            <OpenStreetMap
              origin={origin}
              destination={destination}
              onRouteCalculated={() => {}}
            />
          )
        }
        return (
          <div className="flex h-96 w-full items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-white/5">
            <div className="p-4 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto mb-4 h-16 w-16 text-blue-300/60"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <p className="text-sm font-semibold text-blue-100/80">Modo de cálculo manual</p>
              <p className="mt-2 text-xs text-blue-200/70">No se muestra mapa en este modo</p>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-10 text-blue-100/90">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.45em] text-blue-300/70">Planificador</p>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Calculadora de Distancias</h1>
        </div>
        {(distance || duration) && price && (
          <div className={chipClass}>
            Precio estimado: <span className="font-semibold text-white">${price}</span>
          </div>
        )}
      </div>
      
      {/* Selector de método de cálculo */}
      <div className={`${surfacePanelClass} p-6`}>
        <h2 className="mb-4 text-lg font-semibold text-blue-100/90">Método de Cálculo</h2>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label
            htmlFor="method-manual"
            className="flex cursor-pointer flex-col rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-blue-300/60 hover:bg-white/10"
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                id="method-manual"
                name="calculation-method"
                value="manual"
                checked={calculationMethod === 'manual'}
                onChange={() => setCalculationMethod('manual')}
                className="mt-1 h-4 w-4 text-blue-500 focus:ring-blue-300"
              />
              <div>
                <p className="text-sm font-semibold text-white">Cálculo Inteligente</p>
                <p className="mt-1 text-xs text-blue-200/80">
                  Ingrese origen, destino, distancia y duración manualmente.
                </p>
              </div>
            </div>
          </label>
          
          <label
            htmlFor="method-google"
            className={`flex cursor-pointer flex-col rounded-2xl border p-4 transition ${
              googleMapsApiKeyAvailable
                ? 'border-white/10 bg-white/5 hover:border-blue-300/60 hover:bg-white/10'
                : 'cursor-not-allowed border-white/5 bg-white/5 opacity-60'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                id="method-google"
                name="calculation-method"
                value="google"
                checked={calculationMethod === 'google'}
                onChange={() => setCalculationMethod('google')}
                disabled={!googleMapsApiKeyAvailable}
                className="mt-1 h-4 w-4 text-blue-500 focus:ring-blue-300 disabled:text-slate-400"
              />
              <div>
                <p className={`text-sm font-semibold ${!googleMapsApiKeyAvailable ? 'text-slate-400' : 'text-white'}`}>Google Maps</p>
                <p className="mt-1 text-xs text-blue-200/80">
                  {googleMapsApiKeyAvailable 
                    ? 'Cálculo preciso usando la API de Google Maps.' 
                    : 'Requiere API key de Google Maps (no disponible).'}
                </p>
              </div>
            </div>
          </label>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Formulario */}
        <div className={`${surfacePanelClass} space-y-4 p-6`}>
          <h2 className="text-lg font-semibold text-blue-100/90">Detalles del Viaje</h2>
          
          {renderCalculationMethod()}
          
          <button
            onClick={clearForm}
            className="mt-4 w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/20 hover:text-white whitespace-nowrap"
          >
            Limpiar
          </button>
          
          {error && (
            <div className="mt-4 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}
          
          {(distance || duration) && price && (
            <div className={`mt-6 p-5 ${subtlePanelClass}`}>
              <h3 className="text-md font-semibold text-blue-100/90">Resultado</h3>
              {distance && (
                <p className="mt-2 text-sm text-blue-100/80">
                  Distancia: <span className="font-medium text-white">{distance} millas</span>
                </p>
              )}
              {duration && (
                <p className="mt-1 text-sm text-blue-100/80">
                  Duración: <span className="font-medium text-white">{duration} horas</span>
                </p>
              )}
              <p className="mt-3 text-xl font-bold text-white">Precio: ${price}</p>
              {activeSurcharges.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-blue-200/80">Recargos aplicados:</p>
                  <ul className="mt-2 list-disc pl-5 text-sm text-slate-100">
                    {activeSurcharges.map(id => {
                      const factor = surchargeFactors.find(f => f.id === id);
                      return factor ? <li key={id}>{factor.name}</li> : null;
                    })}
                  </ul>
                </div>
              )}
              {activeDiscounts.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-blue-200/80">Descuentos aplicados:</p>
                  <ul className="mt-2 list-disc pl-5 text-sm text-slate-100">
                    {activeDiscounts.map(id => {
                      const discount = discounts.find(d => d.id === id);
                      return discount ? <li key={id}>{discount.name}</li> : null;
                    })}
                  </ul>
                </div>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={saveTrip}
                  className="transform rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-transform duration-150 hover:scale-[1.02] hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 whitespace-nowrap"
                >
                  Guardar Viaje
                </button>
                
                <button
                  onClick={createTripOrder}
                  disabled={orderCreated}
                  className={`transform rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition-transform duration-150 whitespace-nowrap ${
                    orderCreated
                      ? 'bg-purple-500/40 cursor-not-allowed'
                      : 'bg-purple-500 hover:bg-purple-400 hover:scale-[1.02]'
                  }`}
                >
                  {orderCreated ? 'Orden Creada' : 'Crear Orden'}
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Mapa */}
        <div className={`${surfacePanelClass} p-4`}>
          {renderMap()}
        </div>
      </div>
      
      {/* Factores de recargo y descuentos */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Factores de recargo */}
        <div className={`${surfacePanelClass} p-6`}>
          <h2 className="mb-4 text-lg font-semibold text-blue-100/90">Factores de Recargo</h2>
          
          <div className="space-y-3">
            {surchargeFactors.map((factor) => (
              <label
                key={factor.id}
                htmlFor={`surcharge-${factor.id}`}
                className="flex flex-wrap items-center gap-3 text-sm text-slate-100"
              >
                <input
                  type="checkbox"
                  id={`surcharge-${factor.id}`}
                  checked={activeSurcharges.includes(factor.id)}
                  onChange={() => handleSurchargeChange(factor.id)}
                  className="h-4 w-4 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-300"
                />
                <span>
                  {factor.name} ({factor.type === 'percentage' ? `${factor.rate}%` : `$${factor.rate}`})
                </span>
              </label>
            ))}
          </div>
        </div>
        
        {/* Descuentos */}
        <div className={`${surfacePanelClass} p-6`}>
          <h2 className="mb-4 text-lg font-semibold text-blue-100/90">Descuentos Aplicables</h2>
          
          <div className="space-y-3">
            {discounts.map((discount) => (
              <label
                key={discount.id}
                htmlFor={`discount-${discount.id}`}
                className="flex flex-wrap items-center gap-3 text-sm text-slate-100"
              >
                <input
                  type="checkbox"
                  id={`discount-${discount.id}`}
                  checked={activeDiscounts.includes(discount.id)}
                  onChange={() => handleDiscountChange(discount.id)}
                  className="h-4 w-4 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-300"
                />
                <span>
                  {discount.name} ({discount.type === 'percentage' ? `${discount.rate}%` : `$${discount.rate}`})
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DistanceCalculator