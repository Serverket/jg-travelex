import { useState, useEffect, useCallback } from 'react'
import PlaceSearch from './PlaceSearch'
import { getDirections } from '../services/googleMapsService'
import { fetchRouteFuelPrices } from '../services/fuelPriceService'
import { useEiaQuota } from '../hooks/useEiaQuota'

const tabs = [
  { id: 'combined', label: 'Distancia + Tiempo', description: 'Precio basado en distancia y duración del viaje.' },
  { id: 'distance-only', label: 'Solo Distancia', description: 'Precio calculado únicamente por millas recorridas.' },
  { id: 'duration-only', label: 'Solo Tiempo', description: 'Precio basado solo en el tiempo estimado.' }
]

const GoogleDistanceInput = ({ isGoogleReady, googleLoadError, onCalculate, onRoutePathChange }) => {
  const [calculationType, setCalculationType] = useState('combined')
  const [errors, setErrors] = useState({})
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)
  const [routeError, setRouteError] = useState('')

  // Fuel calculation state
  const [fuelEnabled, setFuelEnabled] = useState(false)
  const [mpg, setMpg] = useState(38)
  const [fuelPricePerGallon, setFuelPricePerGallon] = useState(3.50)
  const [fuelGallons, setFuelGallons] = useState(null)
  const [fuelCost, setFuelCost] = useState(null)
  const [fuelCostMin, setFuelCostMin] = useState(null)
  const [fuelCostMax, setFuelCostMax] = useState(null)
  const [fuelSource, setFuelSource] = useState('')
  const [fuelPaddRegions, setFuelPaddRegions] = useState([])
  const [fuelReason, setFuelReason] = useState(null)
  const [isLoadingFuel, setIsLoadingFuel] = useState(false)
  const eiaQuota = useEiaQuota()

  const [combinedState, setCombinedState] = useState({
    origin: null,
    destination: null,
    distance: '',
    duration: ''
  })

  const [distanceOnlyState, setDistanceOnlyState] = useState({
    origin: null,
    destination: null,
    distance: ''
  })

  const [durationOnlyState, setDurationOnlyState] = useState({
    origin: null,
    destination: null,
    duration: ''
  })

  const getCurrentState = useCallback(() => {
    switch (calculationType) {
      case 'distance-only':
        return distanceOnlyState
      case 'duration-only':
        return durationOnlyState
      case 'combined':
      default:
        return combinedState
    }
  }, [calculationType, combinedState, distanceOnlyState, durationOnlyState])

  const currentState = getCurrentState()
  const { origin, destination, distance, duration } = currentState

  const updateCurrentState = useCallback((updates) => {
    switch (calculationType) {
      case 'distance-only':
        setDistanceOnlyState(prev => ({ ...prev, ...updates }))
        break
      case 'duration-only':
        setDurationOnlyState(prev => ({ ...prev, ...updates }))
        break
      case 'combined':
      default:
        setCombinedState(prev => ({ ...prev, ...updates }))
        break
    }
  }, [calculationType])

  // Notify parent whenever calculate-able data changes
  useEffect(() => {
    if (!validate(true)) return

    const payload = {
      origin: origin || null,
      destination: destination || null,
      calculationType,
      distance: calculationType === 'duration-only' ? null : (distance ? Number(distance) : null),
      duration: calculationType === 'distance-only' ? null : (duration ? Number(duration) : null)
    }

    onCalculate(payload)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, distance, duration, calculationType])

  // Fuel calculation
  useEffect(() => {
    if (!fuelEnabled || !distance || Number(distance) <= 0 || !mpg || mpg <= 0) {
      setFuelGallons(null)
      setFuelCost(null)
      setFuelCostMin(null)
      setFuelCostMax(null)
      setFuelSource('')
      setFuelPaddRegions([])
      setFuelReason(null)
      return
    }

    const gallons = Number(distance) / Number(mpg)
    setFuelGallons(gallons.toFixed(2))

    const computeCost = async () => {
      setIsLoadingFuel(true)
      try {
        const originAddr = origin?.address || origin?.description || ''
        const destAddr = destination?.address || destination?.description || ''

        if (originAddr && destAddr) {
          const quotaStatus = eiaQuota.getStatus()
          if (quotaStatus.used < quotaStatus.limit) {
            const result = await fetchRouteFuelPrices(originAddr, destAddr)
            eiaQuota.increment()
            setFuelPaddRegions(result.paddRegions || [])
            setFuelReason(result.reason)
            if (result.price !== null) {
              setFuelCost((gallons * result.price).toFixed(2))
              setFuelCostMin(null)
              setFuelCostMax(null)
              setFuelSource(result.source)
              setFuelPricePerGallon(result.price)
              setIsLoadingFuel(false)
              return
            }
            if (result.priceMin !== null && result.priceMax !== null) {
              setFuelCost(null)
              setFuelCostMin((gallons * result.priceMin).toFixed(2))
              setFuelCostMax((gallons * result.priceMax).toFixed(2))
              setFuelSource(result.source)
              setFuelPricePerGallon((result.priceMin + result.priceMax) / 2)
              setIsLoadingFuel(false)
              return
            }
          }
        }

        // Fallback to manual price
        setFuelPaddRegions([])
        setFuelReason('api_error')
        const manualPrice = Number(fuelPricePerGallon) || 3.50
        setFuelCost((gallons * manualPrice).toFixed(2))
        setFuelCostMin(null)
        setFuelCostMax(null)
        setFuelSource('Manual')
      } catch (err) {
        console.error('Fuel calculation error:', err)
        setFuelPaddRegions([])
        setFuelReason('network')
        const manualPrice = Number(fuelPricePerGallon) || 3.50
        setFuelCost((gallons * manualPrice).toFixed(2))
        setFuelSource('Manual')
      } finally {
        setIsLoadingFuel(false)
      }
    }

    computeCost()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuelEnabled, distance, mpg, fuelPricePerGallon, origin, destination])

  const validate = (fieldsOnly = false) => {
    const newErrors = {}

    if (calculationType === 'combined') {
      if (!origin || !origin.lat || !origin.lng) newErrors.origin = 'El origen es obligatorio'
      if (!destination || !destination.lat || !destination.lng) newErrors.destination = 'El destino es obligatorio'
      if (!distance) newErrors.distance = 'La distancia es obligatoria'
      else if (isNaN(distance) || Number(distance) <= 0) newErrors.distance = 'Distancia inválida'
      if (!duration) newErrors.duration = 'La duración es obligatoria'
      else if (isNaN(duration) || Number(duration) <= 0) newErrors.duration = 'Duración inválida'
    }

    if (calculationType === 'distance-only') {
      if (!distance) newErrors.distance = 'La distancia es obligatoria'
      else if (isNaN(distance) || Number(distance) <= 0) newErrors.distance = 'Distancia inválida'
    }

    if (calculationType === 'duration-only') {
      if (!duration) newErrors.duration = 'La duración es obligatoria'
      else if (isNaN(duration) || Number(duration) <= 0) newErrors.duration = 'Duración inválida'
    }

    if (!fieldsOnly) setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const calculateRoute = async () => {
    if (!origin || !destination || !origin.lat || !destination.lat) {
      setRouteError('Seleccione origen y destino')
      return
    }
    if (!isGoogleReady) {
      setRouteError('Google Maps aún no está cargado')
      return
    }

    setIsLoadingRoute(true)
    setRouteError('')

    try {
      const data = await getDirections(origin, destination)

      const route = data?.routes?.[0]
      const leg = route?.legs?.[0]
      if (!leg || !leg.distance || !leg.duration) {
        throw new Error('La respuesta no contiene datos de ruta válidos')
      }

      const distanceInMiles = (leg.distance.value / 1609.34).toFixed(2)
      const durationInHours = (leg.duration.value / 3600).toFixed(2)

      const updates = {}
      if (calculationType !== 'duration-only') updates.distance = distanceInMiles
      if (calculationType !== 'distance-only') updates.duration = durationInHours
      if (Object.keys(updates).length > 0) {
        updateCurrentState(updates)
      }

      // Decode polyline and pass up to parent for map rendering
      if (window.google?.maps?.geometry?.encoding && route?.overview_polyline?.points) {
        const path = window.google.maps.geometry.encoding.decodePath(route.overview_polyline.points)
        onRoutePathChange?.(path)
      } else {
        onRoutePathChange?.(null)
      }
    } catch (error) {
      console.error('Error calculando ruta:', error)
      setRouteError(error.message || 'Error al calcular la ruta')
      onRoutePathChange?.(null)
    } finally {
      setIsLoadingRoute(false)
    }
  }

  const handleCalculationTypeChange = (nextType) => {
    setCalculationType(nextType)
    setErrors({})
    setRouteError('')
    onRoutePathChange?.(null)
  }

  const buildNavigationUrl = () => {
    if (!origin || !destination) return '#'
    const o = `${origin.lat},${origin.lng}`
    const d = `${destination.lat},${destination.lng}`
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(o)}&destination=${encodeURIComponent(d)}&travelmode=driving`
  }

  if (googleLoadError) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-red-400/30 bg-red-500/10 px-6 text-center text-red-200">
        {googleLoadError}
      </div>
    )
  }

  if (!isGoogleReady) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-blue-100/80">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Cargando Google Maps...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-slate-100">
      {/* Tabs */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
        <div className="flex overflow-hidden rounded-xl border border-white/10 bg-white/10 p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleCalculationTypeChange(tab.id)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                calculationType === tab.id
                  ? 'bg-blue-500/20 text-white shadow-inner shadow-blue-500/40'
                  : 'text-blue-100/70 hover:text-white hover:bg-blue-500/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-blue-100/70">{tabs.find(tab => tab.id === calculationType)?.description}</p>
      </div>

      {/* Origin */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-blue-100/90">
          Origen {calculationType !== 'combined' && <span className="text-blue-200/60">(opcional)</span>}
        </label>
        <PlaceSearch
          key={`origin-${calculationType}`}
          placeholder="Ingrese dirección de origen"
          onPlaceSelect={(place) => updateCurrentState({ origin: place })}
          enableSmartLocation={true}
        />
        {errors.origin && <p className="mt-1 text-sm text-red-300">{errors.origin}</p>}
      </div>

      {/* Destination */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-blue-100/90">
          Destino {calculationType !== 'combined' && <span className="text-blue-200/60">(opcional)</span>}
        </label>
        <PlaceSearch
          key={`destination-${calculationType}`}
          placeholder="Ingrese dirección de destino"
          onPlaceSelect={(place) => updateCurrentState({ destination: place })}
        />
        {errors.destination && <p className="mt-1 text-sm text-red-300">{errors.destination}</p>}
      </div>

      {/* Calculate Route Button */}
      <button
        type="button"
        onClick={calculateRoute}
        disabled={isLoadingRoute || !origin || !destination}
        className="w-full rounded-full border border-white/10 bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:bg-blue-500/40"
      >
        {isLoadingRoute ? 'Calculando ruta...' : 'Calcular Ruta'}
      </button>

      {routeError && (
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {routeError}
        </div>
      )}

      {/* Navigate in Google Maps */}
      {origin && destination && (
        <a
          href={buildNavigationUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:scale-[1.02] hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4" />
          </svg>
          Iniciar Navegación en Google Maps
        </a>
      )}

      {/* Fuel Toggle */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <label className="flex cursor-pointer items-center gap-3">
          <div className="relative inline-flex h-6 w-11 items-center">
            <input
              type="checkbox"
              checked={fuelEnabled}
              onChange={(e) => setFuelEnabled(e.target.checked)}
              className="peer sr-only"
            />
            <span className="absolute h-6 w-11 rounded-full bg-white/10 transition peer-checked:bg-amber-500" />
            <span className="absolute left-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
          </div>
          <span className="text-sm font-semibold text-amber-100/90">Incluir cálculo de combustible</span>
        </label>

        {fuelEnabled && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="google-mpg" className="mb-1 block text-xs font-medium text-amber-100/80">
                  MPG (millas/galón)
                </label>
                <input
                  type="number"
                  id="google-mpg"
                  value={mpg || ''}
                  onChange={(e) => setMpg(Number(e.target.value))}
                  min="0.1"
                  step="0.1"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label htmlFor="google-fuel-price" className="mb-1 flex items-center gap-2 text-xs font-medium text-amber-100/80">
                  Precio/galón ($)
                  {fuelSource && fuelSource !== 'Manual' && (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                      EIA
                    </span>
                  )}
                  {(!fuelSource || fuelSource === 'Manual') && (
                    <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-blue-200/60">
                      Manual
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  id="google-fuel-price"
                  value={fuelPricePerGallon || ''}
                  onChange={(e) => setFuelPricePerGallon(Number(e.target.value))}
                  disabled={isLoadingFuel}
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {isLoadingFuel && (
              <div className="flex items-center gap-2 text-xs text-amber-200/70">
                <svg className="animate-spin h-3.5 w-3.5 text-amber-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Consultando precios de combustible...
              </div>
            )}

            {fuelGallons && (
              <div className={`rounded-xl border p-3 transition-all ${isLoadingFuel ? 'border-amber-400/30 animate-pulse' : 'border-amber-500/20 bg-amber-500/10'}`}>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p className="text-sm font-medium text-amber-100">
                    {fuelGallons} galones
                  </p>
                </div>
                {fuelCost !== null && (
                  <p className="mt-1 text-sm text-amber-100/90">
                    Costo combustible: <span className="font-semibold text-white">${fuelCost}</span>
                  </p>
                )}
                {fuelCostMin !== null && fuelCostMax !== null && (
                  <p className="mt-1 text-sm text-amber-100/90">
                    Costo combustible:{' '}
                    <span className="font-semibold text-white">${fuelCostMin} – ${fuelCostMax}</span>
                  </p>
                )}

                {/* Source indicator */}
                {fuelSource && fuelSource !== 'Manual' && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-xs text-emerald-200/80">
                      Precio EIA — {fuelPaddRegions.join(' / ')}
                    </span>
                  </div>
                )}
                {fuelSource === 'Manual' && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-300/40" />
                    <span className="text-xs text-blue-200/60">
                      {fuelReason === 'no_key' && 'Precio manual — sin clave EIA configurada'}
                      {fuelReason === 'quota' && 'Precio manual — cuota EIA alcanzada'}
                      {fuelReason === 'network' && 'Precio manual — error de red'}
                      {fuelReason === 'no_state' && 'Precio manual — dirección sin estado reconocido'}
                      {fuelReason === 'api_error' && 'Precio manual — API EIA no disponible'}
                      {!fuelReason && 'Precio manual'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Distance */}
      {(calculationType === 'combined' || calculationType === 'distance-only') && (
        <div>
          <label htmlFor="google-distance" className="mb-1 block text-sm font-semibold text-blue-100/90">
            Distancia (millas)
          </label>
          <input
            type="number"
            id="google-distance"
            value={distance || ''}
            onChange={(event) => updateCurrentState({ distance: event.target.value })}
            className={`w-full rounded-xl border px-3 py-2 text-sm text-white transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              errors.distance ? 'border-red-400/60 bg-red-500/10' : 'border-white/15 bg-white/5 placeholder:text-blue-200/60'
            }`}
            placeholder="Ingrese la distancia en millas"
            min="0"
            step="any"
          />
          {errors.distance && <p className="mt-1 text-sm text-red-300">{errors.distance}</p>}
        </div>
      )}

      {/* Duration */}
      {(calculationType === 'combined' || calculationType === 'duration-only') && (
        <div>
          <label htmlFor="google-duration" className="mb-1 block text-sm font-semibold text-blue-100/90">
            Duración (horas)
          </label>
          <input
            type="number"
            id="google-duration"
            value={duration || ''}
            onChange={(event) => updateCurrentState({ duration: event.target.value })}
            className={`w-full rounded-xl border px-3 py-2 text-sm text-white transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              errors.duration ? 'border-red-400/60 bg-red-500/10' : 'border-white/15 bg-white/5 placeholder:text-blue-200/60'
            }`}
            placeholder="Ingrese la duración en horas"
            min="0"
            step="any"
          />
          {errors.duration && <p className="mt-1 text-sm text-red-300">{errors.duration}</p>}
        </div>
      )}

      {/* Info box */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-300" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm text-blue-100/80">
              {calculationType === 'combined' && 'Precio basado en distancia y tiempo de viaje.'}
              {calculationType === 'distance-only' && 'Precio basado solo en la distancia del viaje.'}
              {calculationType === 'duration-only' && 'Precio basado solo en la duración del viaje.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GoogleDistanceInput
