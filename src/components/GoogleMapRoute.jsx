import { useEffect, useRef } from 'react'
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api'

const mapContainerStyle = { width: '100%', height: '100%' }

const defaultCenter = { lat: 37.7749, lng: -122.4194 }

const mapOptions = {
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
}

const GoogleMapRoute = ({ origin, destination, path, stops }) => {
  const mapRef = useRef(null)
  const prevPathRef = useRef(null)

  useEffect(() => {
    if (!mapRef.current || !path || path.length === 0) return

    // Only fit bounds when path actually changes
    const pathChanged =
      !prevPathRef.current ||
      prevPathRef.current.length !== path.length ||
      prevPathRef.current.some((pt, i) =>
        pt.lat !== path[i].lat || pt.lng !== path[i].lng
      )

    if (pathChanged) {
      const bounds = new window.google.maps.LatLngBounds()
      path.forEach((point) => bounds.extend(point))
      if (origin) bounds.extend({ lat: origin.lat, lng: origin.lng })
      if (destination) bounds.extend({ lat: destination.lat, lng: destination.lng })
      if (stops && stops.length > 0) {
        stops.forEach((stop) => bounds.extend({ lat: stop.lat, lng: stop.lng }))
      }
      mapRef.current.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 })
      prevPathRef.current = path.map((p) => ({ lat: p.lat, lng: p.lng }))
    }
  }, [path, origin, destination, stops])

  const handleLoad = (map) => {
    mapRef.current = map
  }

  return (
    <div className="h-full w-full rounded overflow-hidden">
      <GoogleMap
        center={origin || defaultCenter}
        zoom={origin && destination ? undefined : 10}
        mapContainerStyle={mapContainerStyle}
        onLoad={handleLoad}
        options={mapOptions}
      >
        {origin && (
          <Marker
            position={{ lat: origin.lat, lng: origin.lng }}
            title="Origen"
            label="A"
          />
        )}
        {destination && (
          <Marker
            position={{ lat: destination.lat, lng: destination.lng }}
            title="Destino"
            label="B"
          />
        )}
        {stops && stops.map((stop, i) => (
          <Marker
            key={`stop-${i}`}
            position={{ lat: stop.lat, lng: stop.lng }}
            title={stop.name}
            label={{
              text: (i + 1).toString(),
              color: '#000000',
              fontWeight: 'bold',
              fontSize: '11px'
            }}
            icon={window.google?.maps ? {
              url: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
              labelOrigin: new window.google.maps.Point(15, 10)
            } : 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png'}
          />
        ))}
        {path && path.length > 0 && (
          <Polyline
            path={path}
            options={{
              strokeColor: '#1E40AF',
              strokeWeight: 5,
              strokeOpacity: 0.85,
            }}
          />
        )}
      </GoogleMap>
    </div>
  )
}

export default GoogleMapRoute
