import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

const OpenStreetPlaceSearch = ({ onPlaceSelected, placeholder, value }) => {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState(null)
  const [hoveredSuggestionId, setHoveredSuggestionId] = useState(null)
  const timeoutRef = useRef(null)
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (typeof value === 'string') {
      setQuery(value)
    } else if (value && typeof value === 'object' && value.description) {
      setQuery(value.description)
    }
  }, [value])

  const updateDropdownPosition = useCallback(() => {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    setDropdownPosition({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width
    })
  }, [])

  const searchPlaces = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 3) {
      setSuggestions([])
      setDropdownPosition(null)
      return
    }

    setLoading(true)
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(
        `${backendUrl}/places/search?q=${encodeURIComponent(searchQuery)}`
      )

      if (response.ok) {
        const data = await response.json()
        setSuggestions(
          data.map((item) => ({
            id: item.place_id,
            description: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            address: item.display_name
          }))
        )
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
  }, [])

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (query.length >= 3) {
      timeoutRef.current = setTimeout(() => {
        searchPlaces(query)
      }, 500)
    } else {
      setSuggestions([])
      setDropdownPosition(null)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [query, searchPlaces])

  const handleSelectPlace = (place) => {
    setQuery(place.description)
    setSuggestions([])
    setShowSuggestions(false)
    setDropdownPosition(null)
    setHoveredSuggestionId(null)

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      const insideInput = containerRef.current?.contains(event.target) ?? false
      const insideDropdown = dropdownRef.current?.contains(event.target) ?? false

      if (!insideInput && !insideDropdown) {
        setShowSuggestions(false)
        setHoveredSuggestionId(null)
        setDropdownPosition(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useLayoutEffect(() => {
    if (showSuggestions && suggestions.length > 0) {
      updateDropdownPosition()
    } else {
      setDropdownPosition(null)
    }
  }, [showSuggestions, suggestions.length, query, updateDropdownPosition])

  useEffect(() => {
    if (!showSuggestions || suggestions.length === 0) return

    const handleWindowChange = () => updateDropdownPosition()
    window.addEventListener('resize', handleWindowChange)
    window.addEventListener('scroll', handleWindowChange, true)

    return () => {
      window.removeEventListener('resize', handleWindowChange)
      window.removeEventListener('scroll', handleWindowChange, true)
    }
  }, [showSuggestions, suggestions.length, updateDropdownPosition])

  const suggestionsDropdown =
    showSuggestions && suggestions.length > 0 && dropdownPosition
      ? createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            backgroundColor: '#020617',
            color: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid rgba(148, 163, 184, 0.22)',
            boxShadow: '0 20px 45px rgba(15, 23, 42, 0.55)',
            zIndex: 1000,
            maxHeight: '240px',
            overflowY: 'auto',
            padding: '6px'
          }}
        >
          {suggestions.map((place, index) => {
            const isHovered = hoveredSuggestionId === place.id
            return (
              <div
                key={place.id}
                onMouseEnter={() => setHoveredSuggestionId(place.id)}
                onMouseLeave={() => setHoveredSuggestionId(null)}
                onMouseDown={(event) => {
                  event.preventDefault()
                  handleSelectPlace(place)
                }}
                style={{
                  cursor: 'pointer',
                  padding: '12px',
                  borderRadius: '10px',
                  marginBottom: index === suggestions.length - 1 ? 0 : 4,
                  backgroundColor: isHovered ? 'rgba(30, 64, 175, 0.55)' : 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(148, 163, 184, 0.18)',
                  transition: 'background-color 120ms ease'
                }}
              >
                <div style={{ fontWeight: 600, lineHeight: 1.35 }}>{place.description}</div>
              </div>
            )
          })}
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
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            setShowSuggestions(true)
            requestAnimationFrame(updateDropdownPosition)
          }}
          placeholder={placeholder || 'Buscar lugar...'}
          className="block w-full px-4 py-2 text-sm text-white transition border shadow-inner rounded-xl border-white/15 bg-slate-950 placeholder-white/40 shadow-slate-950/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {loading && (
          <div className="absolute right-3 top-2.5">
            <svg className="w-5 h-5 text-blue-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>
      {suggestionsDropdown}
    </>
  )
}

export default OpenStreetPlaceSearch