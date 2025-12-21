import { useState, useEffect, useRef } from 'react'

const OpenStreetPlaceSearch = ({ onPlaceSelected, placeholder, value }) => {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const timeoutRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (typeof value === 'string') {
      setQuery(value)
    }
  }, [value])

  // Función para buscar lugares usando la API de Nominatim (OpenStreetMap)
  const searchPlaces = async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 3) {
      setSuggestions([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`,
        {
          headers: {
            'Accept-Language': 'es', // Preferencia de idioma
            'User-Agent': 'JGExpress Trip Calculator' // Identificación de la aplicación
          }
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.map(item => ({
          id: item.place_id,
          description: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          address: item.display_name
        })))
      } else {
        console.error('Error en la búsqueda de lugares:', response.statusText)
        setSuggestions([])
      }
    } catch (error) {
      console.error('Error en la búsqueda de lugares:', error)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  // Manejar cambios en el input con debounce
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (query.length >= 3) {
      timeoutRef.current = setTimeout(() => {
        searchPlaces(query)
      }, 500) // Esperar 500ms después de que el usuario deje de escribir
    } else {
      setSuggestions([])
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [query])

  // Manejar selección de lugar
  const handleSelectPlace = (place) => {
    setQuery(place.description)
    setSuggestions([])
    setShowSuggestions(false)
    
    if (onPlaceSelected) {
      onPlaceSelected({
        id: place.id,
        description: place.description,
        lat: place.lat,
        lng: place.lng,
        address: place.address
      })
    }
  }

  // Cerrar sugerencias al hacer clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="relative w-full" ref={inputRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
        placeholder={placeholder || 'Buscar lugar...'}
        className="block w-full rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/40 shadow-inner shadow-blue-500/10 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      
      {loading && (
        <div className="absolute right-3 top-2.5">
          <svg className="h-5 w-5 animate-spin text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-white/10 bg-slate-900 shadow-xl shadow-slate-900/40">
          {suggestions.map((place) => (
            <div
              key={place.id}
              className="border-b border-white/5 p-3 text-sm text-blue-100/90 transition hover:bg-white/5 hover:text-white last:border-b-0 cursor-pointer"
              onClick={() => handleSelectPlace(place)}
            >
              <div className="font-medium leading-snug">{place.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default OpenStreetPlaceSearch