import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { getAutocomplete, reverseGeocode } from '../services/googleMapsService'

/**
 * PlaceSearch — address autocomplete backed entirely by the Supabase Edge Function.
 * No Google Maps JS SDK, no client-side API key required.
 */
const PlaceSearch = ({ placeholder, onPlaceSelect, enableSmartLocation = false }) => {
  const [query, setQuery]                     = useState('')
  const [suggestions, setSuggestions]         = useState([])
  const [loading, setLoading]                 = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [dropdownPos, setDropdownPos]         = useState(null)
  const [hoveredId, setHoveredId]             = useState(null)
  const [isLocating, setIsLocating]           = useState(false)
  const [locationSource, setLocationSource]   = useState(null)

  const inputRef     = useRef(null)
  const containerRef = useRef(null)
  const dropdownRef  = useRef(null)
  const debounceRef  = useRef(null)

  // ── Dropdown positioning ──────────────────────────────────────────────────
  const updateDropdownPos = useCallback(() => {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    setDropdownPos({ top: rect.bottom + 6, left: rect.left, width: rect.width })
  }, [])

  useLayoutEffect(() => {
    if (showSuggestions && suggestions.length > 0) updateDropdownPos()
    else setDropdownPos(null)
  }, [showSuggestions, suggestions.length, updateDropdownPos])

  useEffect(() => {
    if (!showSuggestions || !suggestions.length) return
    const handle = () => updateDropdownPos()
    window.addEventListener('resize', handle)
    window.addEventListener('scroll', handle, true)
    return () => {
      window.removeEventListener('resize', handle)
      window.removeEventListener('scroll', handle, true)
    }
  }, [showSuggestions, suggestions.length, updateDropdownPos])

  // ── Click-outside to close ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target) && !dropdownRef.current?.contains(e.target)) {
        setShowSuggestions(false)
        setDropdownPos(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Debounced autocomplete via Edge Function ──────────────────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (query.length < 3) { setSuggestions([]); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await getAutocomplete(query)
        setSuggestions(results)
        if (results.length > 0) setShowSuggestions(true)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  // ── Select a suggestion ───────────────────────────────────────────────────
  const handleSelect = (place) => {
    setQuery(place.description)
    setSuggestions([])
    setShowSuggestions(false)
    setDropdownPos(null)
    setHoveredId(null)
    setLocationSource(null)
    onPlaceSelect({ lat: place.lat, lng: place.lng, address: place.description })
  }

  // ── Smart GPS location ────────────────────────────────────────────────────
  const handleSmartLocation = () => {
    if (!navigator.geolocation) { alert('Su navegador no soporta geolocalización.'); return }
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude, accuracy } }) => {
        const source = accuracy < 100 ? 'gps' : 'network'
        setLocationSource(source)
        try {
          const data = await reverseGeocode(latitude, longitude)
          const address = data.results?.[0]?.formatted_address
          if (address) {
            setQuery(address)
            onPlaceSelect({ lat: latitude, lng: longitude, address, isAutoDetected: true })
          }
        } catch { alert('Error obteniendo dirección del GPS') }
        finally { setIsLocating(false) }
      },
      (err) => { console.error(err); setIsLocating(false); alert('No se pudo obtener la ubicación.') },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  // ── Dropdown portal ───────────────────────────────────────────────────────
  const dropdown = showSuggestions && suggestions.length > 0 && dropdownPos
    ? createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            backgroundColor: '#020617',
            color: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid rgba(148,163,184,0.22)',
            boxShadow: '0 20px 45px rgba(15,23,42,0.55)',
            zIndex: 1000,
            maxHeight: '240px',
            overflowY: 'auto',
            padding: '6px',
          }}
        >
          {suggestions.map((place, i) => (
            <div
              key={place.placeId}
              onMouseEnter={() => setHoveredId(place.placeId)}
              onMouseLeave={() => setHoveredId(null)}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(place) }}
              style={{
                cursor: 'pointer',
                padding: '12px',
                borderRadius: '10px',
                marginBottom: i === suggestions.length - 1 ? 0 : 4,
                backgroundColor: hoveredId === place.placeId ? 'rgba(30,64,175,0.55)' : 'rgba(15,23,42,0.95)',
                border: '1px solid rgba(148,163,184,0.18)',
                transition: 'background-color 120ms ease',
              }}
            >
              <div style={{ fontWeight: 600, lineHeight: 1.35 }}>{place.description}</div>
            </div>
          ))}
        </div>,
        document.body
      )
    : null

  return (
    <>
      <div className="relative w-full" ref={containerRef}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setLocationSource(null) }}
          onFocus={() => { if (suggestions.length) { setShowSuggestions(true); requestAnimationFrame(updateDropdownPos) } }}
          placeholder={placeholder || 'Buscar dirección…'}
          disabled={isLocating}
          className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-blue-100/90 placeholder-blue-300/30 shadow-sm backdrop-blur-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="animate-spin h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}

        {/* Smart GPS button */}
        {enableSmartLocation && !query && !isLocating && !loading && (
          <button
            onClick={handleSmartLocation}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-400/70 hover:text-blue-300 transition"
            title="Detectar mi ubicación (GPS)"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}

        {/* GPS locating spinner */}
        {isLocating && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <svg className="animate-spin h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}

        {/* Location source badge */}
        {locationSource && !isLocating && query && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none gap-1" title={locationSource === 'gps' ? 'Ubicación precisa (GPS)' : 'Ubicación aproximada (Red/WiFi)'}>
            <span className="text-sm">{locationSource === 'gps' ? '🛰️' : '📶'}</span>
            <span className="text-xs text-blue-400 font-medium hidden sm:inline">{locationSource === 'gps' ? 'GPS' : 'WiFi'}</span>
          </div>
        )}
      </div>

      {dropdown}
    </>
  )
}

export default PlaceSearch
