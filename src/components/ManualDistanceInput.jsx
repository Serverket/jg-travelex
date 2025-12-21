import React, { useState, useEffect, useCallback } from 'react'
import OpenStreetPlaceSearch from './OpenStreetPlaceSearch'

const tabs = [
  { id: 'combined', label: 'Distancia + Tiempo', description: 'Precio basado en distancia y duración del viaje.' },
  { id: 'distance-only', label: 'Solo Distancia', description: 'Precio calculado únicamente por millas recorridas.' },
  { id: 'duration-only', label: 'Solo Tiempo', description: 'Precio basado solo en el tiempo estimado.' }
]

const ManualDistanceInput = ({ onCalculate }) => {
  const [calculationType, setCalculationType] = useState('combined')
  const [errors, setErrors] = useState({})

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

  useEffect(() => {
    let cancelled = false

    const fetchRoute = async () => {
      if (
        calculationType === 'combined' &&
        origin && origin.lat && origin.lng &&
        destination && destination.lat && destination.lng
      ) {
        try {
          const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false&alternatives=true&steps=true&hints=;`
          )
          const data = await response.json()

          if (!cancelled && data.routes && data.routes.length > 0) {
            const [route] = data.routes
            const distanceInMiles = route.distance / 1609.34
            const durationInHours = route.duration / 3600

            updateCurrentState({
              distance: distanceInMiles.toFixed(2),
              duration: durationInHours.toFixed(2)
            })
          }
        } catch (error) {
          console.error('Error fetching route from OSM:', error)
        }
      }
    }

    fetchRoute()

    return () => {
      cancelled = true
    }
  }, [calculationType, destination, origin, updateCurrentState])

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

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!validate()) return

    const payload = {
      origin: origin || null,
      destination: destination || null,
      calculationType,
      distance: calculationType === 'duration-only' ? null : (distance ? Number(distance) : null),
      duration: calculationType === 'distance-only' ? null : (duration ? Number(duration) : null)
    }

    onCalculate(payload)
  }

  const handleCalculationTypeChange = (nextType) => {
    setCalculationType(nextType)
    setErrors({})
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 text-slate-100"
      data-aos="fade-up"
      data-aos-delay="40"
    >
      <div className="rounded-2xl border border-white/10 bg-white/5 p-2" data-aos="fade-up" data-aos-delay="60">
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

      <div data-aos="fade-up" data-aos-delay="80">
        <label className="mb-1 block text-sm font-semibold text-blue-100/90">
          Origen {calculationType !== 'combined' && <span className="text-blue-200/60">(opcional)</span>}
        </label>
        <OpenStreetPlaceSearch
          key={`origin-${calculationType}`}
          placeholder="Ingrese el lugar de origen"
          onPlaceSelected={(place) => updateCurrentState({ origin: place })}
          value={origin}
        />
        {errors.origin && <p className="mt-1 text-sm text-red-300">{errors.origin}</p>}
      </div>

      <div data-aos="fade-up" data-aos-delay="100">
        <label className="mb-1 block text-sm font-semibold text-blue-100/90">
          Destino {calculationType !== 'combined' && <span className="text-blue-200/60">(opcional)</span>}
        </label>
        <OpenStreetPlaceSearch
          key={`destination-${calculationType}`}
          placeholder="Ingrese el lugar de destino"
          onPlaceSelected={(place) => updateCurrentState({ destination: place })}
          value={destination}
        />
        {errors.destination && <p className="mt-1 text-sm text-red-300">{errors.destination}</p>}
      </div>

      {(calculationType === 'combined' || calculationType === 'distance-only') && (
        <div data-aos="fade-up" data-aos-delay="120">
          <label htmlFor="distance" className="mb-1 block text-sm font-semibold text-blue-100/90">
            Distancia (millas)
          </label>
          <input
            type="number"
            id="distance"
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

      {(calculationType === 'combined' || calculationType === 'duration-only') && (
        <div data-aos="fade-up" data-aos-delay="140">
          <label htmlFor="duration" className="mb-1 block text-sm font-semibold text-blue-100/90">
            Duración (horas)
          </label>
          <input
            type="number"
            id="duration"
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

      <div
        className="rounded-2xl border border-white/10 bg-white/5 p-4"
        data-aos="fade-up"
        data-aos-delay="160"
      >
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
    </form>
  )
}

export default ManualDistanceInput