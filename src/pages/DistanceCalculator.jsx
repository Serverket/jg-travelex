import { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import { GoogleMap, useJsApiLoader, DirectionsRenderer } from '@react-google-maps/api'
import PlaceSearch from '../components/PlaceSearch'
import OpenStreetMap from '../components/OpenStreetMap'
import ManualDistanceInput from '../components/ManualDistanceInput'
import { tripService } from '../services/tripService'
import { orderService } from '../services/orderService'
import { settingsService } from '../services/settingsService'
import { backendService } from '../services/backendService'

const libraries = ['places']

const DistanceCalculator = () => {
  const { currentUser } = useAppContext()
  const [rateSettings, setRateSettings] = useState(null)
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
        const { price: quotedPrice, breakdown } = await backendService.getQuote({
          distance: parseFloat(distance || 0),
          duration: parseFloat(duration || 0),
          surcharges: activeSurcharges,
          discounts: activeDiscounts,
        });
        setPrice(quotedPrice)
        setQuoteBreakdown(breakdown)
        setError('')
      } catch (err) {
        console.error('Error fetching quote:', err)
        setError('Error al calcular el precio')
      }
    }
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

  // Guardar el viaje
  const saveTrip = async () => {
    if (!distance && !duration) {
      setError('Primero debe ingresar distancia o duración')
      return
    }

    const originDescription = typeof origin === 'string' ? origin : (origin?.description || 'Origen no especificado')
    const destinationDescription = typeof destination === 'string' ? destination : (destination?.description || 'Destino no especificado')

    try {
      if (!currentUser || !currentUser.id) {
        setError('Debe iniciar sesión para guardar el viaje')
        return
      }
      const today = new Date()
      const tripDate = today.toISOString().split('T')[0] // YYYY-MM-DD
      const distanceMiles = Number(distance || 0)
      const durationMinutes = duration ? Math.round(Number(duration) * 60) : null

      const tripData = {
        origin_address: originDescription,
        destination_address: destinationDescription,
        ...(origin && origin.lat != null && origin.lng != null ? { origin_lat: origin.lat, origin_lng: origin.lng } : {}),
        ...(destination && destination.lat != null && destination.lng != null ? { destination_lat: destination.lat, destination_lng: destination.lng } : {}),
        distance_miles: distanceMiles,
        distance_km: Number((distanceMiles * 1.60934).toFixed(2)),
        duration_minutes: durationMinutes,
        trip_date: tripDate,
        base_price: quoteBreakdown?.base !== undefined ? Number(quoteBreakdown.base) : null,
        surcharges: Array.isArray(quoteBreakdown?.surcharges)
          ? quoteBreakdown.surcharges.reduce((sum, s) => sum + Number(s.amount || 0), 0)
          : null,
        discounts: Array.isArray(quoteBreakdown?.discounts)
          ? quoteBreakdown.discounts.reduce((sum, d) => sum + Number(d.amount || 0), 0)
          : null,
        final_price: price != null ? Number(price) : null
      }

      const savedTrip = await tripService.createTrip(tripData)
      
      // Save surcharges and discounts with amounts from backend breakdown
      if (quoteBreakdown?.surcharges?.length) {
        await Promise.all(
          quoteBreakdown.surcharges.map(s =>
            tripService.addSurcharge(savedTrip.id, s.id, s.amount)
          )
        )
      }
      if (quoteBreakdown?.discounts?.length) {
        await Promise.all(
          quoteBreakdown.discounts.map(d =>
            tripService.addDiscount(savedTrip.id, d.id, d.amount)
          )
        )
      }
      
      setError('')
      alert('Viaje guardado correctamente')
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

    const originDescription = typeof origin === 'string' ? origin : (origin?.description || 'Origen no especificado')
    const destinationDescription = typeof destination === 'string' ? destination : (destination?.description || 'Destino no especificado')

    try {
      // First save the trip
      const today = new Date()
      const tripDate = today.toISOString().split('T')[0] // YYYY-MM-DD
      const distanceMiles = Number(distance || 0)
      const durationMinutes = duration ? Math.round(Number(duration) * 60) : null

      const tripData = {
        origin_address: originDescription,
        destination_address: destinationDescription,
        ...(origin && origin.lat != null && origin.lng != null ? { origin_lat: origin.lat, origin_lng: origin.lng } : {}),
        ...(destination && destination.lat != null && destination.lng != null ? { destination_lat: destination.lat, destination_lng: destination.lng } : {}),
        distance_miles: distanceMiles,
        distance_km: Number((distanceMiles * 1.60934).toFixed(2)),
        duration_minutes: durationMinutes,
        trip_date: tripDate,
        base_price: quoteBreakdown?.base !== undefined ? Number(quoteBreakdown.base) : null,
        surcharges: Array.isArray(quoteBreakdown?.surcharges)
          ? quoteBreakdown.surcharges.reduce((sum, s) => sum + Number(s.amount || 0), 0)
          : null,
        discounts: Array.isArray(quoteBreakdown?.discounts)
          ? quoteBreakdown.discounts.reduce((sum, d) => sum + Number(d.amount || 0), 0)
          : null,
        final_price: price != null ? Number(price) : null
      }

      const savedTrip = await tripService.createTrip(tripData)
      
      // Save surcharges and discounts with amounts from backend breakdown
      if (quoteBreakdown?.surcharges?.length) {
        await Promise.all(
          quoteBreakdown.surcharges.map(s =>
            tripService.addSurcharge(savedTrip.id, s.id, s.amount)
          )
        )
      }
      if (quoteBreakdown?.discounts?.length) {
        await Promise.all(
          quoteBreakdown.discounts.map(d =>
            tripService.addDiscount(savedTrip.id, d.id, d.amount)
          )
        )
      }
      
      // Create order
      const orderData = {
        user_id: currentUser?.id,
        status: 'pending',
        total_amount: parseFloat(price)
      }
      
      const createdOrder = await orderService.createOrder(orderData)
      // Create order item linked to the trip
      await orderService.createOrderItem({
        order_id: createdOrder.id,
        trip_id: savedTrip.id,
        amount: parseFloat(price)
      })
      setOrderCreated(true)
      setError('')
      alert('Orden creada correctamente')
    } catch (error) {
      console.error('Error creating order:', error)
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
          return <div className="flex justify-center items-center h-64">Cargando Google Maps...</div>
        }
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Origen</label>
              <PlaceSearch 
                placeholder="Ingrese dirección de origen" 
                onPlaceSelect={handleOriginSelect} 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destino</label>
              <PlaceSearch 
                placeholder="Ingrese dirección de destino" 
                onPlaceSelect={handleDestinationSelect} 
              />
            </div>
            
            <button
              onClick={calculateGoogleRoute}
              disabled={isLoading || !origin || !destination}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
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
          <div className="h-96 w-full rounded overflow-hidden bg-gray-100 flex items-center justify-center">
            <div className="text-center p-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <p className="text-gray-500">Modo de cálculo manual</p>
              <p className="text-gray-400 text-sm mt-2">No se muestra mapa en este modo</p>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Calculadora de Distancias</h1>
      
      {/* Selector de método de cálculo */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-700 mb-4">Método de Cálculo</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <input
              type="radio"
              id="method-manual"
              name="calculation-method"
              value="manual"
              checked={calculationMethod === 'manual'}
              onChange={() => setCalculationMethod('manual')}
              className="mr-2"
            />
            <label htmlFor="method-manual" className="text-sm text-gray-700">
              Cálculo Inteligente
            </label>
            <p className="text-xs text-gray-500 mt-1">Ingrese origen, destino, distancia y duración manualmente</p>
          </div>
          
          <div>
            <input
              type="radio"
              id="method-google"
              name="calculation-method"
              value="google"
              checked={calculationMethod === 'google'}
              onChange={() => setCalculationMethod('google')}
              disabled={!googleMapsApiKeyAvailable}
              className="mr-2"
            />
            <label htmlFor="method-google" className={`text-sm ${!googleMapsApiKeyAvailable ? 'text-gray-400' : 'text-gray-700'}`}>
              Google Maps
            </label>
            <p className="text-xs text-gray-500 mt-1">
              {googleMapsApiKeyAvailable 
                ? 'Cálculo preciso usando la API de Google Maps' 
                : 'Requiere API key de Google Maps (no disponible)'}
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario */}
        <div className="lg:col-span-1 bg-white p-4 rounded-lg shadow space-y-4">
          <h2 className="text-lg font-medium text-gray-700 mb-4">Detalles del Viaje</h2>
          
          {renderCalculationMethod()}
          
          <button
            onClick={clearForm}
            className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mt-4"
          >
            Limpiar
          </button>
          
          {error && (
            <div className="mt-4 text-sm text-red-600">
              {error}
            </div>
          )}
          
          {(distance || duration) && price && (
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h3 className="text-md font-medium text-gray-700 mb-2">Resultado</h3>
              {distance && <p className="text-sm text-gray-600">Distancia: <span className="font-medium">{distance} millas</span></p>}
              {duration && <p className="text-sm text-gray-600">Duración: <span className="font-medium">{duration} horas</span></p>}
              <p className="text-lg font-bold text-gray-800 mt-2">Precio: ${price}</p>
              {activeSurcharges.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Recargos aplicados:</p>
                  <ul className="list-disc pl-5 text-sm text-gray-600">
                    {activeSurcharges.map(id => {
                      const factor = surchargeFactors.find(f => f.id === id);
                      return factor ? <li key={id}>{factor.name}</li> : null;
                    })}
                  </ul>
                </div>
              )}
              {activeDiscounts.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Descuentos aplicados:</p>
                  <ul className="list-disc pl-5 text-sm text-gray-600">
                    {activeDiscounts.map(id => {
                      const discount = discounts.find(d => d.id === id);
                      return discount ? <li key={id}>{discount.name}</li> : null;
                    })}
                  </ul>
                </div>
              )}
              <div className="mt-4 space-x-2">
                <button
                  onClick={saveTrip}
                  className="py-1 px-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Guardar Viaje
                </button>
                
                <button
                  onClick={createTripOrder}
                  disabled={orderCreated}
                  className="py-1 px-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-purple-300"
                >
                  {orderCreated ? 'Orden Creada' : 'Crear Orden'}
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Mapa */}
        <div className="lg:col-span-1 bg-white p-4 rounded-lg shadow">
          {renderMap()}
        </div>
      </div>
      
      {/* Factores de recargo y descuentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Factores de recargo */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-700 mb-4">Factores de Recargo</h2>
          
          <div className="space-y-2">
            {surchargeFactors.map((factor) => (
              <div key={factor.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={`surcharge-${factor.id}`}
                  checked={activeSurcharges.includes(factor.id)}
                  onChange={() => handleSurchargeChange(factor.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={`surcharge-${factor.id}`} className="ml-2 block text-sm text-gray-700">
                  {factor.name} ({factor.type === 'percentage' ? `${factor.rate}%` : `$${factor.rate}`})
                </label>
              </div>
            ))}
          </div>
        </div>
        
        {/* Descuentos */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-700 mb-4">Descuentos Aplicables</h2>
          
          <div className="space-y-2">
            {discounts.map((discount) => (
              <div key={discount.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={`discount-${discount.id}`}
                  checked={activeDiscounts.includes(discount.id)}
                  onChange={() => handleDiscountChange(discount.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={`discount-${discount.id}`} className="ml-2 block text-sm text-gray-700">
                  {discount.name} ({discount.type === 'percentage' ? `${discount.rate}%` : `$${discount.rate}`})
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DistanceCalculator