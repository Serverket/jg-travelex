import { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../context/AppContext'
import { useJsApiLoader } from '@react-google-maps/api'
import OpenStreetMap from '../components/OpenStreetMap'
import ManualDistanceInput from '../components/ManualDistanceInput'
import GoogleDistanceInput from '../components/GoogleDistanceInput'
import GoogleMapRoute from '../components/GoogleMapRoute'
import WeatherWidget from '../components/WeatherWidget'
import { tripService } from '../services/tripService'
import { orderService } from '../services/orderService'
import { settingsService } from '../services/settingsService'
import { backendService } from '../services/backendService'
import { useToast } from '../context/ToastContext'

const GOOGLE_MAP_LIBRARIES = ['places', 'geometry']

const searchNearbyStops = (location) => {
  return new Promise((resolve) => {
    if (!window.google?.maps?.places) {
      resolve([])
      return
    }
    const service = new window.google.maps.places.PlacesService(document.createElement('div'))
    service.nearbySearch({
      location: location,
      radius: 15000, // 15 km
      type: ['gas_station']
    }, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        resolve(results)
      } else {
        resolve([])
      }
    })
  })
}

const getStopPriority = (name) => {
  const n = name.toLowerCase()
  if (n.includes('wawa') || n.includes('racetrack') || n.includes('race trac')) {
    return 1
  }
  if (n.includes('circle k') || n.includes('circlek')) {
    return 2
  }
  return 3
}

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
  const [calculationMethod, setCalculationMethod] = useState('google') // 'manual', 'google'

  // Estado para origen y destino
  const [origin, setOrigin] = useState(null)
  const [destination, setDestination] = useState(null)

  // Estado común para todos los métodos
  const [distance, setDistance] = useState(null)
  const [duration, setDuration] = useState(null)
  const [price, setPrice] = useState(null)
  const [fuelCost, setFuelCost] = useState(0)
  const [addFuelToPrice, setAddFuelToPrice] = useState(false)
  const [quoteBreakdown, setQuoteBreakdown] = useState(null)
  const [activeSurcharges, setActiveSurcharges] = useState([])
  const [activeDiscounts, setActiveDiscounts] = useState([])
  const [error, setError] = useState('')
  const [orderCreated, setOrderCreated] = useState(false)
  const [routePath, setRoutePath] = useState(null)
  const [stopInterval, setStopInterval] = useState(4)
  const [stops, setStops] = useState([])
  const [stopOptionsMap, setStopOptionsMap] = useState({})
  const [isLoadingStops, setIsLoadingStops] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const lastTripRef = useRef(null)
  const surfacePanelClass = 'rounded-3xl border border-white/10 bg-white/5 shadow-xl shadow-blue-950/20 backdrop-blur-lg'

  const subtlePanelClass = 'rounded-2xl border border-white/10 bg-white/5'

  const chipClass = 'rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-blue-100/80 shadow-lg shadow-blue-950/20'

  // Cargar Google Maps JS API (para mapa, Places Autocomplete y polyline decoding)
  const googleMapsApiKey = import.meta.env.VITE_NSA_REGISTRY
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey,
    libraries: GOOGLE_MAP_LIBRARIES,
  })

  const googleMapsLoadError = loadError
    ? (loadError.message || 'No se pudo cargar Google Maps. Verifique la API key.')
    : null

  const googleMapsApiKeyAvailable = Boolean(googleMapsApiKey)

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
        if (settings && settings.default_stop_interval_hours) {
          setStopInterval(Number(settings.default_stop_interval_hours))
        }
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

  // Recalcular paradas sugeridas si cambia la ruta o el intervalo
  useEffect(() => {
    const calculateStops = async () => {
      if (!isLoaded || !routePath || routePath.length === 0 || !duration || Number(duration) < 4) {
        setStops([])
        setStopOptionsMap({})
        return
      }

      setIsLoadingStops(true)
      try {
        const totalDurationHours = Number(duration)
        const interval = Number(stopInterval) || 4
        const numStops = Math.floor(totalDurationHours / interval)

        if (numStops <= 0) {
          setStops([])
          setStopOptionsMap({})
          setIsLoadingStops(false)
          return
        }

        const totalLength = window.google.maps.geometry.spherical.computeLength(routePath)
        const newStops = []
        const optionsMap = {}

        for (let j = 1; j <= numStops; j++) {
          const targetTime = j * interval
          const ratio = targetTime / totalDurationHours
          const targetDistance = totalLength * ratio

          // Encontrar coordenadas en la ruta a la distancia objetivo
          let accumDist = 0
          let stopLatLng = null
          for (let i = 0; i < routePath.length - 1; i++) {
            const p1 = routePath[i]
            const p2 = routePath[i + 1]
            const segDist = window.google.maps.geometry.spherical.computeDistanceBetween(p1, p2)
            if (accumDist + segDist >= targetDistance) {
              const fraction = (targetDistance - accumDist) / segDist
              stopLatLng = window.google.maps.geometry.spherical.interpolate(p1, p2, fraction)
              break
            }
            accumDist += segDist
          }
          if (!stopLatLng && routePath.length > 0) {
            stopLatLng = routePath[routePath.length - 1]
          }

          if (stopLatLng) {
            const rawResults = await searchNearbyStops(stopLatLng)
            const processed = rawResults.map(r => {
              const dist = window.google.maps.geometry.spherical.computeDistanceBetween(stopLatLng, r.geometry.location)
              const priority = getStopPriority(r.name)
              return {
                name: r.name,
                address: r.vicinity || r.formatted_address || '',
                lat: r.geometry.location.lat(),
                lng: r.geometry.location.lng(),
                distance: dist,
                priority
              }
            })

            processed.sort((a, b) => {
              if (a.priority !== b.priority) return a.priority - b.priority
              return a.distance - b.distance
            })

            const stopIndex = j - 1
            optionsMap[stopIndex] = processed

            if (processed.length > 0) {
              newStops.push({
                ...processed[0],
                stopIndex,
                hoursFromStart: targetTime
              })
            } else {
              newStops.push({
                name: `Parada Sugerida ${j}`,
                address: `Ruta principal (milla ${((targetDistance / 1609.34).toFixed(1))})`,
                lat: stopLatLng.lat(),
                lng: stopLatLng.lng(),
                distance: 0,
                priority: 3,
                stopIndex,
                hoursFromStart: targetTime
              })
            }
          }
        }

        setStops(newStops)
        setStopOptionsMap(optionsMap)
      } catch (err) {
        console.error('Error calculando paradas:', err)
      } finally {
        setIsLoadingStops(false)
      }
    }

    calculateStops()
  }, [routePath, duration, stopInterval, isLoaded])

  const getGoogleMapsNavUrl = () => {
    if (!origin || !destination) return ''
    const originStr = encodeURIComponent(`${origin.lat},${origin.lng}`)
    const destStr = encodeURIComponent(`${destination.lat},${destination.lng}`)
    
    if (stops.length === 0) {
      return `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}`
    }
    
    const waypointsStr = encodeURIComponent(
      stops.map(s => `${s.lat},${s.lng}`).join('|')
    )
    return `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}&waypoints=${waypointsStr}`
  }

  // Manejar entrada manual de distancia y duración (OSM)
  const handleManualCalculation = (data) => {
    setOrigin(data.origin)
    setDestination(data.destination)
    setDistance(data.distance)
    setDuration(data.duration)
    setFuelCost(data.fuelCost || 0)
    setAddFuelToPrice(data.addFuelToPrice || false)
  }

  // Manejar cálculo desde Google Distance Input
  const handleGoogleCalculation = (data) => {
    setOrigin(data.origin)
    setDestination(data.destination)
    setDistance(data.distance)
    setDuration(data.duration)
    setFuelCost(data.fuelCost || 0)
    setAddFuelToPrice(data.addFuelToPrice || false)
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
      ? (typeof origin === 'string' ? origin : (origin.description || origin.address || 'Origen no especificado'))
      : 'Origen no especificado'

    const destinationDescription = destination
      ? (typeof destination === 'string' ? destination : (destination.description || destination.address || 'Destino no especificado'))
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
      final_price: addFuelToPrice && fuelCost 
        ? Number(price) + Number(fuelCost) 
        : (price != null ? Number(price) : 0)
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
        subtotal: addFuelToPrice && fuelCost 
          ? parseFloat(price) + parseFloat(fuelCost)
          : parseFloat(price),
        total_amount: addFuelToPrice && fuelCost 
          ? parseFloat(price) + parseFloat(fuelCost)
          : parseFloat(price)
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

  // Limpiar estado específico del modo de cálculo al cambiar de modo
  useEffect(() => {
    setOrigin(null)
    setDestination(null)
    setDistance(null)
    setDuration(null)
    setPrice(null)
    setQuoteBreakdown(null)
    setRoutePath(null)
    setStops([])
    setStopOptionsMap({})
    setError('')
    setOrderCreated(false)
    setResetKey((k) => k + 1)
    // Mantener surcharges/discounts porque son agnósticos al modo
  }, [calculationMethod])

  // Limpiar el formulario
  const clearForm = () => {
    setOrigin(null)
    setDestination(null)
    setDistance(null)
    setDuration(null)
    setPrice(null)
    setQuoteBreakdown(null)
    setRoutePath(null)
    setStops([])
    setStopOptionsMap({})
    setActiveSurcharges([])
    setActiveDiscounts([])
    setError('')
    setOrderCreated(false)
    setCalculationMethod('google')
    setFuelCost(0)
    setAddFuelToPrice(false)
    setResetKey((k) => k + 1)
  }

  // Renderizar el método de cálculo seleccionado
  const renderCalculationMethod = () => {
    switch (calculationMethod) {
      case 'manual':
        return (
          <ManualDistanceInput key={`manual-${resetKey}`} onCalculate={handleManualCalculation} currentUser={currentUser} />
        )
      case 'google':
        return (
          <GoogleDistanceInput
            key={`google-${resetKey}`}
            isGoogleReady={isLoaded}
            googleLoadError={googleMapsLoadError}
            onCalculate={handleGoogleCalculation}
            onRoutePathChange={setRoutePath}
            currentUser={currentUser}
          />
        )
      default:
        return null
    }
  }

  // Renderizar el mapa según el método seleccionado
  const renderMap = () => {
    switch (calculationMethod) {
      case 'google':
        if (googleMapsLoadError || !isLoaded) return null
        return (
          <GoogleMapRoute
            origin={origin}
            destination={destination}
            path={routePath}
            stops={stops}
          />
        )
      case 'manual':
        if (origin && destination && origin.lat && origin.lng && destination.lat && destination.lng) {
          return (
            <OpenStreetMap
              origin={origin}
              destination={destination}
              onRouteCalculated={() => { }}
            />
          )
        }
        return (
          <div className="flex overflow-hidden justify-center items-center w-full h-96 rounded-3xl border border-white/10 bg-white/5">
            <div className="p-4 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto mb-4 w-16 h-16 text-blue-300/60"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <p className="text-sm font-semibold text-blue-100/80">Mapa OpenStreetMap</p>
              <p className="mt-2 text-xs text-blue-200/70">Seleccione origen y destino para ver la ruta</p>
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
            Precio estimado: <span className="font-semibold text-white">${addFuelToPrice ? (Number(price) + Number(fuelCost)).toFixed(2) : price}</span>
            {currentUser?.role === 'admin' && addFuelToPrice && fuelCost > 0 && (
              <span className="ml-1 text-xs text-amber-200/80">(+ ${Number(fuelCost).toFixed(2)} combustible)</span>
            )}
          </div>
        )}
      </div>

      {/* Selector de método de cálculo */}
      <div className={`p-6 ${surfacePanelClass}`}>
        <h2 className="mb-4 text-lg font-semibold text-blue-100/90">Método de Cálculo</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label
            htmlFor="method-google"
            className={`flex cursor-pointer flex-col rounded-2xl border p-4 transition ${googleMapsApiKeyAvailable && !googleMapsLoadError
              ? 'border-white/10 bg-white/5 hover:border-blue-300/60 hover:bg-white/10'
              : 'cursor-not-allowed border-white/5 bg-white/5 opacity-60'
              }`}
          >
            <div className="flex gap-3 items-start">
              <input
                type="radio"
                id="method-google"
                name="calculation-method"
                value="google"
                checked={calculationMethod === 'google'}
                onChange={() => setCalculationMethod('google')}
                disabled={!googleMapsApiKeyAvailable || !!googleMapsLoadError}
                className="mt-1 w-4 h-4 text-blue-500 focus:ring-blue-300 disabled:text-slate-400"
              />
              <div>
                <p className={`text-sm font-semibold ${(!googleMapsApiKeyAvailable || googleMapsLoadError) ? 'text-slate-400' : 'text-white'}`}>Google Maps</p>
                <p className="mt-1 text-xs text-blue-200/80">
                  {googleMapsLoadError
                    ? googleMapsLoadError
                    : googleMapsApiKeyAvailable
                      ? 'Rutas con Google Directions, mapa y autocomplete nativos.'
                      : 'Requiere VITE_NSA_REGISTRY (no disponible).'}
                </p>
              </div>
            </div>
          </label>

          <label
            htmlFor="method-manual"
            className="flex flex-col p-4 rounded-2xl border transition cursor-pointer border-white/10 bg-white/5 hover:border-blue-300/60 hover:bg-white/10"
          >
            <div className="flex gap-3 items-start">
              <input
                type="radio"
                id="method-manual"
                name="calculation-method"
                value="manual"
                checked={calculationMethod === 'manual'}
                onChange={() => setCalculationMethod('manual')}
                className="mt-1 w-4 h-4 text-blue-500 focus:ring-blue-300"
              />
              <div>
                <p className="text-sm font-semibold text-white">OSM (Alternativa)</p>
                <p className="mt-1 text-xs text-blue-200/80">
                  Ingrese origen, destino, distancia y duración manualmente con OpenStreetMap.
                </p>
              </div>
            </div>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Formulario */}
        <div className={`p-6 space-y-4 ${surfacePanelClass}`}>
          <h2 className="text-lg font-semibold text-blue-100/90">Detalles del Viaje</h2>

          {renderCalculationMethod()}

          {/* Weather Widget auto-appears when destination is set */}
          <WeatherWidget
            destination={destination}
            date={new Date().toISOString().split('T')[0]}
          />

          <button
            onClick={clearForm}
            className="px-4 py-2 mt-4 w-full text-sm font-medium text-blue-100 whitespace-nowrap rounded-full border transition border-white/10 bg-white/5 hover:border-blue-300/60 hover:bg-blue-500/20 hover:text-white"
          >
            Limpiar
          </button>

          {error && (
            <div className="px-4 py-3 mt-4 text-sm text-red-100 rounded-xl border border-red-400/40 bg-red-500/10">
              {error}
            </div>
          )}

          {(distance || duration) && price && (
            <div className={`p-5 mt-6 ${subtlePanelClass}`}>
              <h3 className="font-semibold text-md text-blue-100/90">Resultado</h3>
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
              <p className="mt-3 text-xl font-bold text-white">
                Precio: ${addFuelToPrice ? (Number(price) + Number(fuelCost)).toFixed(2) : price}
                {currentUser?.role === 'admin' && addFuelToPrice && fuelCost > 0 && (
                  <span className="ml-1 text-sm text-amber-200/80">(+ ${Number(fuelCost).toFixed(2)} combustible)</span>
                )}
              </p>
              {activeSurcharges.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-blue-200/80">Recargos aplicados:</p>
                  <ul className="pl-5 mt-2 text-sm list-disc text-slate-100">
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
                  <ul className="pl-5 mt-2 text-sm list-disc text-slate-100">
                    {activeDiscounts.map(id => {
                      const discount = discounts.find(d => d.id === id);
                      return discount ? <li key={id}>{discount.name}</li> : null;
                    })}
                  </ul>
                </div>
              )}
              <div className="flex flex-wrap gap-3 mt-6">
                <button
                  onClick={saveTrip}
                  className="transform rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-transform duration-150 hover:scale-[1.02] hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 whitespace-nowrap"
                >
                  Guardar Viaje
                </button>

                <button
                  onClick={createTripOrder}
                  disabled={orderCreated}
                  className={`transform rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition-transform duration-150 whitespace-nowrap ${orderCreated
                    ? 'bg-purple-500/40 cursor-not-allowed'
                    : 'bg-purple-500 hover:bg-purple-400 hover:scale-[1.02]'
                    }`}
                >
                  {orderCreated ? 'Orden Creada' : 'Crear Orden'}
                </button>
              </div>
            </div>
          )}

          {/* Planificador de Paradas Sugeridas */}
          {Number(duration) >= 4 && (stops.length > 0 || isLoadingStops) && (
            <div className={`p-5 mt-6 ${subtlePanelClass}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-md text-amber-200">Planificador de Paradas</h3>
                <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-300">
                  Viaje Largo ({stops.length} {stops.length === 1 ? 'parada' : 'paradas'})
                </span>
              </div>
              
              <div className="mb-4">
                <label htmlFor="stop-interval" className="block text-xs font-medium text-blue-200/80 mb-1">
                  Intervalo de paradas: <span className="font-semibold text-white">{stopInterval} horas</span>
                </label>
                <input
                  type="range"
                  id="stop-interval"
                  min="4"
                  max="8"
                  step="0.5"
                  value={stopInterval}
                  onChange={(e) => setStopInterval(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-blue-200/60 mt-1">
                  <span>Cada 4 hrs</span>
                  <span>Cada 6 hrs</span>
                  <span>Cada 8 hrs</span>
                </div>
              </div>

              {isLoadingStops ? (
                <div className="flex flex-col items-center justify-center py-8 text-xs text-amber-200/70">
                  <svg className="animate-spin h-6 w-6 text-amber-300 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Buscando estaciones de servicio preferidas en la ruta...</span>
                </div>
              ) : (
                <>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                    {stops.map((stop, index) => (
                      <div key={index} className="rounded-xl border border-white/5 bg-white/5 p-3 relative">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-2">
                            <div className="w-5 h-5 flex items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-slate-900 mt-0.5">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-amber-200">
                                Parada sugerida {index + 1} (~{stop.hoursFromStart}h)
                              </p>
                              <p className="text-sm font-medium text-white mt-1">{stop.name}</p>
                              <p className="text-xs text-blue-200/70 mt-0.5">{stop.address}</p>
                            </div>
                          </div>
                          
                          {stop.priority === 1 && (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-medium text-emerald-300">
                              Preferida
                            </span>
                          )}
                          {stop.priority === 2 && (
                            <span className="inline-flex items-center rounded-full bg-blue-500/20 px-2 py-0.5 text-[9px] font-medium text-blue-300">
                              Circle K
                            </span>
                          )}
                        </div>

                        {/* Alternativas */}
                        {stopOptionsMap[index] && stopOptionsMap[index].length > 1 && (
                          <div className="mt-2.5 pt-2.5 border-t border-white/5">
                            <label className="block text-[10px] font-medium text-blue-200/60 mb-1">
                              Cambiar parada por otra estación cercana:
                            </label>
                            <select
                              value={`${stop.lat},${stop.lng}`}
                              onChange={(e) => {
                                const [lat, lng] = e.target.value.split(',').map(Number)
                                const selectedOption = stopOptionsMap[index].find(opt => opt.lat === lat && opt.lng === lng)
                                if (selectedOption) {
                                  setStops(prev => {
                                    const copy = [...prev]
                                    copy[index] = {
                                      ...selectedOption,
                                      stopIndex: index,
                                      hoursFromStart: stop.hoursFromStart
                                    }
                                    return copy
                                  })
                                }
                              }}
                              className="w-full text-xs text-blue-100 rounded-lg border border-white/10 bg-slate-900 px-2 py-1 focus:border-amber-400 focus:outline-none"
                            >
                              {stopOptionsMap[index].map((opt, oIdx) => (
                                <option key={oIdx} value={`${opt.lat},${opt.lng}`}>
                                  {opt.name} ({opt.priority === 1 ? '★ Wawa/Racetrack' : opt.priority === 2 ? 'Circle K' : 'Estación'}) - {(opt.distance / 1609.34).toFixed(1)}mi
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <a
                      href={getGoogleMapsNavUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full rounded-xl border border-amber-400/50 bg-amber-500/20 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-amber-500/35"
                    >
                      <svg className="w-4 h-4 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Abrir ruta en Google Maps con paradas
                    </a>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Mapa */}
        <div className={`p-4 ${surfacePanelClass} min-h-[320px] sm:min-h-[400px] md:min-h-[480px]`}>
          {renderMap()}
        </div>
      </div>

      {/* Factores de recargo y descuentos */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Factores de recargo */}
        <div className={`p-6 ${surfacePanelClass}`}>
          <h2 className="mb-4 text-lg font-semibold text-blue-100/90">Factores de Recargo</h2>

          <div className="space-y-3">
            {surchargeFactors.map((factor) => (
              <label
                key={factor.id}
                htmlFor={`surcharge-${factor.id}`}
                className="flex flex-wrap gap-3 items-center text-sm text-slate-100"
              >
                <input
                  type="checkbox"
                  id={`surcharge-${factor.id}`}
                  checked={activeSurcharges.includes(factor.id)}
                  onChange={() => handleSurchargeChange(factor.id)}
                  className="w-4 h-4 text-blue-500 rounded border-white/20 bg-white/10 focus:ring-blue-300"
                />
                <span>
                  {factor.name} ({factor.type === 'percentage' ? `${factor.rate}%` : `$${factor.rate}`})
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Descuentos */}
        <div className={`p-6 ${surfacePanelClass}`}>
          <h2 className="mb-4 text-lg font-semibold text-blue-100/90">Descuentos Aplicables</h2>

          <div className="space-y-3">
            {discounts.map((discount) => (
              <label
                key={discount.id}
                htmlFor={`discount-${discount.id}`}
                className="flex flex-wrap gap-3 items-center text-sm text-slate-100"
              >
                <input
                  type="checkbox"
                  id={`discount-${discount.id}`}
                  checked={activeDiscounts.includes(discount.id)}
                  onChange={() => handleDiscountChange(discount.id)}
                  className="w-4 h-4 text-blue-500 rounded border-white/20 bg-white/10 focus:ring-blue-300"
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