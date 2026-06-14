import React, { useState, useEffect, useCallback } from 'react'
import OpenStreetPlaceSearch from './OpenStreetPlaceSearch'
import { fetchRouteFuelPrices } from '../services/fuelPriceService'
import { useEiaQuota } from '../hooks/useEiaQuota'

const tabs = [
  { id: 'combined', label: 'Distancia + Tiempo', description: 'Precio basado en distancia y duración del viaje.' },
  { id: 'distance-only', label: 'Solo Distancia', description: 'Precio calculado únicamente por millas recorridas.' },
  { id: 'duration-only', label: 'Solo Tiempo', description: 'Precio basado solo en el tiempo estimado.' }
]

const ManualDistanceInput = ({ onCalculate }) => {
  const [calculationType, setCalculationType] = useState('combined')
  const [errors, setErrors] = useState({})

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

  useEffect(() => {
    let cancelled = false

    const shouldFetchRoute = () => (
      ['combined', 'distance-only', 'duration-only'].includes(calculationType) &&
      origin && origin.lat && origin.lng &&
      destination && destination.lat && destination.lng
    )

    const fetchRoute = async () => {
      if (!shouldFetchRoute()) return

      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false&alternatives=true&steps=true&hints=;`
        )
        const data = await response.json()

        if (!cancelled && data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const [route] = data.routes
          const distanceInMiles = (route.distance / 1609.34).toFixed(2)
          const durationInHours = (route.duration / 3600).toFixed(2)

          const updates = {}
          if (calculationType !== 'duration-only') updates.distance = distanceInMiles
          if (calculationType !== 'distance-only') updates.duration = durationInHours

          if (Object.keys(updates).length > 0) {
            updateCurrentState(updates)
          }
        } else if (!cancelled) {
          console.warn('OSRM route request failed or returned no routes:', data)
        }
      } catch (error) {
        console.error('Error fetching route from OSM:', error)
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
        const originAddr = origin?.address || origin?.display_name || origin?.description || ''
        const destAddr = destination?.address || destination?.display_name || destination?.description || ''

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
                <label htmlFor="manual-mpg" className="mb-1 block text-xs font-medium text-amber-100/80">
                  MPG (millas/galón)
                </label>
                <input
                  type="number"
                  id="manual-mpg"
                  value={mpg || ''}
                  onChange={(e) => setMpg(Number(e.target.value))}
                  min="0.1"
                  step="0.1"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label htmlFor="manual-fuel-price" className="mb-1 flex items-center gap-2 text-xs font-medium text-amber-100/80">
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
                  id="manual-fuel-price"
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