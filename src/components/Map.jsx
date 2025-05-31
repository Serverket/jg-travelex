import { useState, useCallback, useEffect } from 'react'
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Marker } from '@react-google-maps/api'

const containerStyle = {
  width: '100%',
  height: '400px'
}

const defaultCenter = {
  lat: 40.7128, // New York
  lng: -74.0060
}

const libraries = ['places', 'directions']

const Map = ({ origin, destination, directions, setDirections }) => {
  const [map, setMap] = useState(null)
  const [center, setCenter] = useState(defaultCenter)
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_APP_GOOGLE_MAPS_API_KEY,
    libraries
  })

  // Actualizar el centro del mapa basado en origen o destino
  useEffect(() => {
    if (origin && origin.lat && origin.lng) {
      setCenter(origin)
    } else if (destination && destination.lat && destination.lng) {
      setCenter(destination)
    }
  }, [origin, destination])

  const onLoad = useCallback(function callback(map) {
    setMap(map)
  }, [])

  const onUnmount = useCallback(function callback() {
    setMap(null)
  }, [])

  // Calcular ruta cuando origen y destino están definidos
  useEffect(() => {
    if (isLoaded && origin && destination && origin.lat && origin.lng && destination.lat && destination.lng) {
      const directionsService = new window.google.maps.DirectionsService()

      directionsService.route(
        {
          origin: new window.google.maps.LatLng(origin.lat, origin.lng),
          destination: new window.google.maps.LatLng(destination.lat, destination.lng),
          travelMode: window.google.maps.TravelMode.DRIVING
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result)
          } else {
            console.error(`Error al calcular la ruta: ${status}`)
          }
        }
      )
    }
  }, [isLoaded, origin, destination, setDirections])

  if (loadError) {
    return <div className="p-4 text-red-500">Error al cargar Google Maps</div>
  }

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-[400px] bg-gray-100 rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="rounded-lg overflow-hidden shadow-lg">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={10}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      >
        {origin && origin.lat && origin.lng && (
          <Marker
            position={origin}
            label={{
              text: 'A',
              color: 'white',
            }}
          />
        )}
        
        {destination && destination.lat && destination.lng && (
          <Marker
            position={destination}
            label={{
              text: 'B',
              color: 'white',
            }}
          />
        )}
        
        {directions && <DirectionsRenderer directions={directions} />}
      </GoogleMap>
    </div>
  )
}

export default Map