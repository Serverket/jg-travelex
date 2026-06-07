import { useState, useCallback, useEffect } from 'react'
import { GoogleMap, DirectionsRenderer, Marker } from '@react-google-maps/api'

const containerStyle = {
  width: '100%',
  height: '100%'
}

const defaultCenter = {
  lat: 40.7128, // New York
  lng: -74.0060
}

const Map = ({ origin, destination, directions, isLoaded }) => {
  const [map, setMap] = useState(null)

  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance)
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  // Fit bounds to the route whenever directions change
  useEffect(() => {
    if (map && directions?.routes?.[0]?.bounds) {
      map.fitBounds(directions.routes[0].bounds, { padding: 50 })
    }
  }, [map, directions])

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-full bg-slate-900/50 rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  let center = defaultCenter
  if (origin && origin.lat && origin.lng) {
    center = origin
  } else if (destination && destination.lat && destination.lng) {
    center = destination
  }

  return (
    <div className="h-full w-full rounded-lg overflow-hidden shadow-lg">
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
        
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#1E40AF',
                strokeWeight: 5,
              },
            }}
          />
        )}
      </GoogleMap>
    </div>
  )
}

export default Map
