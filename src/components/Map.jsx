import { useState, useCallback, useEffect } from 'react'
import { GoogleMap, Polyline, Marker } from '@react-google-maps/api'

const containerStyle = {
  width: '100%',
  height: '100%'
}

const defaultCenter = {
  lat: 40.7128,
  lng: -74.0060
}

const routeOptions = {
  strokeColor: '#1E40AF',
  strokeWeight: 5,
  strokeOpacity: 0.8,
}

const Map = ({ origin, destination, routePath, routeBounds, isLoaded }) => {
  const [map, setMap] = useState(null)

  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance)
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  // Fit bounds to the route whenever bounds change
  useEffect(() => {
    if (map && routeBounds && window.google) {
      const bounds = new window.google.maps.LatLngBounds(
        { lat: routeBounds.southwest.lat, lng: routeBounds.southwest.lng },
        { lat: routeBounds.northeast.lat, lng: routeBounds.northeast.lng }
      )
      map.fitBounds(bounds, { padding: 50 })
    }
  }, [map, routeBounds])

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
          <Marker position={origin} label={{ text: 'A', color: 'white' }} />
        )}
        {destination && destination.lat && destination.lng && (
          <Marker position={destination} label={{ text: 'B', color: 'white' }} />
        )}
        {routePath && routePath.length > 0 && (
          <Polyline path={routePath} options={routeOptions} />
        )}
      </GoogleMap>
    </div>
  )
}

export default Map
