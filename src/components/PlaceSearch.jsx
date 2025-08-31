import { useState, useEffect, useRef } from 'react'

const PlaceSearch = ({ placeholder, onPlaceSelect }) => {
  const [inputValue, setInputValue] = useState('')
  const autoCompleteRef = useRef(null)
  const inputRef = useRef(null)
  
  useEffect(() => {
    const initAutocomplete = () => {
      if (!inputRef.current) return
      
      autoCompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        { types: ['address'], componentRestrictions: { country: 'us' } }
      )
      
      autoCompleteRef.current.addListener('place_changed', () => {
        const place = autoCompleteRef.current.getPlace()
        
        if (!place.geometry || !place.geometry.location) {
          console.error('No se encontraron detalles para este lugar')
          return
        }
        
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          address: place.formatted_address
        }
        
        setInputValue(place.formatted_address)
        onPlaceSelect(location)
      })
    }
    
    initAutocomplete()
  }, [onPlaceSelect])
  
  const handleInputChange = (e) => {
    setInputValue(e.target.value)
  }
  
  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      />
      {!inputValue && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  )
}

export default PlaceSearch