import { useState, useEffect, useRef, useCallback } from 'react'

const PlaceSearch = ({ placeholder, onPlaceSelect, enableSmartLocation = false, autoLocateOnLoad = false }) => {
  const [inputValue, setInputValue] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const [locationSource, setLocationSource] = useState(null)
  const [statusMessage, setStatusMessage] = useState(null)
  const [isGoogleReady, setIsGoogleReady] = useState(false)
  const autoCompleteRef = useRef(null)
  const inputRef = useRef(null)
  const listenerRef = useRef(null)
  const checkIntervalRef = useRef(null)

  // Detect when Google Maps JS API is available
  useEffect(() => {
    const checkGoogle = () => {
      if (window.google?.maps?.places) {
        setIsGoogleReady(true)
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current)
          checkIntervalRef.current = null
        }
      }
    }

    checkGoogle()
    if (!window.google?.maps?.places) {
      checkIntervalRef.current = setInterval(checkGoogle, 300)
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
        checkIntervalRef.current = null
      }
    }
  }, [])

  // Initialize Google Places Autocomplete once ready
  useEffect(() => {
    if (!isGoogleReady || !inputRef.current) return
    if (autoCompleteRef.current) return

    autoCompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      { types: ['address'], componentRestrictions: { country: 'us' } }
    )

    const placeChangedListener = autoCompleteRef.current.addListener('place_changed', () => {
      const place = autoCompleteRef.current.getPlace()

      if (!place.geometry || !place.geometry.location) {
        console.warn('PlaceSearch: no geometry for selected place')
        return
      }

      const location = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        description: place.formatted_address,
        address: place.formatted_address
      }

      setInputValue(place.formatted_address)
      setLocationSource(null)
      onPlaceSelect(location)
    })

    listenerRef.current = placeChangedListener

    return () => {
      if (listenerRef.current && window.google?.maps?.event) {
        window.google.maps.event.removeListener(listenerRef.current)
        listenerRef.current = null
      }
      autoCompleteRef.current = null
    }
  }, [isGoogleReady, onPlaceSelect])

  const handleInputChange = (e) => {
    setInputValue(e.target.value)
    if (locationSource) setLocationSource(null)
    if (statusMessage) setStatusMessage(null)
  }

  const handleSmartLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatusMessage({ type: 'error', text: 'Su navegador no soporta geolocalización.' })
      return
    }
    if (!window.google?.maps?.Geocoder) {
      setStatusMessage({ type: 'warning', text: 'Google Maps aún no está disponible. Espere un momento e intente nuevamente.' })
      return
    }

    setIsLocating(true)
    setStatusMessage({ type: 'info', text: '📍 Buscando tu ubicación...' })

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords
        const source = accuracy < 100 ? 'gps' : 'network'
        setLocationSource(source)

        try {
          const geocoder = new window.google.maps.Geocoder()
          const result = await geocoder.geocode({ location: { lat: latitude, lng: longitude } })

          if (result.results[0]) {
            const address = result.results[0].formatted_address
            const location = {
              lat: latitude,
              lng: longitude,
              description: address,
              address: address,
              isAutoDetected: true
            }
            setInputValue(address)
            onPlaceSelect(location)
            
            if (accuracy > 500) {
              setStatusMessage({ type: 'warning', text: '📡 Señal GPS débil. Enciende el WiFi para mejor precisión o ajusta manualmente.' })
            } else {
              setStatusMessage({ type: 'success', text: '📍 Origen detectado correctamente.' })
              // Auto-hide success message after a few seconds
              setTimeout(() => setStatusMessage(null), 4000)
            }
          }
        } catch (error) {
          console.error('Geocoding failed:', error)
          setStatusMessage({ type: 'error', text: '⚠️ Error al obtener la dirección del GPS. Ingresa manualmente.' })
        } finally {
          setIsLocating(false)
        }
      },
      (error) => {
        console.error('Geolocation error:', error)
        setIsLocating(false)
        setStatusMessage({ type: 'warning', text: '⚠️ Acceso denegado o GPS desactivado. Escribe tu dirección manualmente.' })
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    )
  }, [onPlaceSelect])

  // Auto-locate on load if requested
  const hasAutoLocated = useRef(false)
  useEffect(() => {
    if (autoLocateOnLoad && isGoogleReady && !hasAutoLocated.current && !inputValue) {
      hasAutoLocated.current = true
      handleSmartLocation()
    }
  }, [autoLocateOnLoad, isGoogleReady, handleSmartLocation, inputValue])

  return (
    <div className="w-full">
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={isLocating || !isGoogleReady}
          className={`block w-full rounded-xl border px-4 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${isLocating || !isGoogleReady
            ? 'border-white/10 bg-slate-800 text-slate-400'
            : 'border-white/15 bg-slate-950 text-white placeholder-white/40'
            }`}
        />

        {/* Smart Location Button */}
        {enableSmartLocation && !inputValue && !isLocating && (
          <button
            onClick={handleSmartLocation}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-400 hover:text-blue-300 transition"
            title="Detectar mi ubicación (Smart GPS)"
          >
            <span className="sr-only">Detectar ubicación</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}

        {/* Loading Spinner */}
        {isLocating && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}

        {/* Detected Source Indicator */}
        {locationSource && !isLocating && inputValue && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none gap-1" title={locationSource === 'gps' ? 'Ubicación precisa (GPS)' : 'Ubicación aproximada (Red/WiFi)'}>
            <span className="text-sm">{locationSource === 'gps' ? '🛰️' : '📶'}</span>
            <span className="text-xs text-blue-400 font-medium hidden sm:inline">
              {locationSource === 'gps' ? 'GPS' : 'WiFi'}
            </span>
          </div>
        )}
      </div>

      {/* Elegant Status Message (Outside relative wrapper to prevent stretching) */}
      {statusMessage && (
        <div className={`mt-2 text-xs font-medium px-2 py-1.5 rounded-lg border backdrop-blur-sm transition-all duration-300 ${
          statusMessage.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-200' :
          statusMessage.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' :
          statusMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' :
          'bg-blue-500/10 border-blue-500/20 text-blue-200'
        }`}>
          {statusMessage.text}
        </div>
      )}
    </div>
  )
}

export default PlaceSearch