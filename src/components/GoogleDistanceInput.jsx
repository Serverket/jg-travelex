import { useState, useEffect, useCallback } from 'react'
import PlaceSearch from './PlaceSearch'
import { getDirections } from '../services/googleMapsService'

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
