import { useState, useEffect, useRef, useCallback } from 'react'

const PlaceSearch = ({ placeholder, onPlaceSelect, enableSmartLocation = false }) => {
  const [inputValue, setInputValue] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const [locationSource, setLocationSource] = useState(null)
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
  }

  const handleSmartLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Su navegador no soporta geolocalización.')
      return
    }
    if (!window.google?.maps?.Geocoder) {
      alert('Google Maps aún no está disponible. Espere un momento e intente nuevamente.')
      return
    }

    setIsLocating(true)

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
          }
        } catch (error) {
          console.error('Geocoding failed:', error)
          alert('Error obteniendo dirección del GPS')
        } finally {
          setIsLocating(false)
        }
      },
      (error) => {
        console.error('Geolocation error:', error)
        setIsLocating(false)
        alert('No se pudo obtener la ubicación. Verifique los permisos.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [onPlaceSelect])

  return (
    <div className="relative">
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

      {/* Loading State */}
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
  )
}

export default PlaceSearch