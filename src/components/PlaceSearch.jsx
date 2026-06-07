import { useState, useEffect, useRef } from 'react'

const PlaceSearch = ({ placeholder, onPlaceSelect, enableSmartLocation = false, isLoaded = false }) => {
  const [inputValue, setInputValue] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const [locationSource, setLocationSource] = useState(null)
  const [googleReady, setGoogleReady] = useState(false)
  const autoCompleteRef = useRef(null)
  const inputRef = useRef(null)
  const retryTimerRef = useRef(null)

  useEffect(() => {
    if (!isLoaded) { setGoogleReady(false); return }
    const check = () => {
      if (window.google?.maps?.places && inputRef.current) {
        setGoogleReady(true)
        if (retryTimerRef.current) clearInterval(retryTimerRef.current)
      }
    }
    check()
    retryTimerRef.current = setInterval(check, 150)
    return () => { if (retryTimerRef.current) clearInterval(retryTimerRef.current) }
  }, [isLoaded])

  useEffect(() => {
    if (!googleReady || !inputRef.current) return
    try {
      autoCompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        { types: ['address'], componentRestrictions: { country: 'us' } }
      )
      const listener = autoCompleteRef.current.addListener('place_changed', () => {
        const place = autoCompleteRef.current.getPlace()
        if (!place.geometry || !place.geometry.location) {
          console.warn('No se encontraron detalles para este lugar')
          return
        }
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          address: place.formatted_address
        }
        setInputValue(place.formatted_address)
        setLocationSource(null)
        onPlaceSelect(location)
      })
      return () => {
        try { window.google.maps.event.removeListener(listener) } catch (e) { /* noop */ }
      }
    } catch (err) { console.error('Error initializing Autocomplete:', err) }
  }, [googleReady, onPlaceSelect])

  const handleInputChange = (e) => {
    setInputValue(e.target.value)
    if (locationSource) setLocationSource(null)
  }

  const handleSmartLocation = () => {
    if (!navigator.geolocation) { alert("Su navegador no soporta geolocalización."); return }
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
            setInputValue(address)
            onPlaceSelect({ lat: latitude, lng: longitude, address, isAutoDetected: true })
          }
        } catch (error) {
          console.error("Geocoding failed: ", error); alert("Error obteniendo dirección del GPS")
        } finally { setIsLocating(false) }
      },
      (error) => {
        console.error("Geolocation error: ", error); setIsLocating(false)
        alert("No se pudo obtener la ubicación. Verifique los permisos.")
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  return (
    <div className="relative">
      <input ref={inputRef} type="text" value={inputValue} onChange={handleInputChange}
        placeholder={placeholder} disabled={isLocating || !googleReady}
        className={`w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${isLocating ? 'bg-gray-100 text-gray-500' : 'border-gray-300'}`} />
      {enableSmartLocation && !inputValue && !isLocating && (
        <button onClick={handleSmartLocation} className="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-500 hover:text-blue-700 transition" title="Detectar mi ubicación (Smart GPS)">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}
      {isLocating && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
      {locationSource && !isLocating && inputValue && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none gap-1" title={locationSource === 'gps' ? "Ubicación precisa (GPS)" : "Ubicación aproximada (Red/WiFi)"}>
          <span className="text-sm">{locationSource === 'gps' ? '🛰️' : '📶'}</span>
          <span className="text-xs text-blue-600 font-medium hidden sm:inline">{locationSource === 'gps' ? 'GPS' : 'WiFi'}</span>
        </div>
      )}
    </div>
  )
}

export default PlaceSearch
