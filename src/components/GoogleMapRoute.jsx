import { useEffect, useRef, useState, useMemo } from 'react'
import { GoogleMap, MarkerF, PolylineF } from '@react-google-maps/api'

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
  const [mapReady, setMapReady] = useState(false)

  // Normalizar coordenadas a objetos planos { lat, lng } numéricos
  const formattedPath = useMemo(() => {
    if (!path || !Array.isArray(path) || path.length === 0) return null
    return path.map(pt => ({
      lat: typeof pt.lat === 'function' ? pt.lat() : Number(pt.lat),
      lng: typeof pt.lng === 'function' ? pt.lng() : Number(pt.lng)
    }))
  }, [path])

  useEffect(() => {
    if (!mapRef.current || !mapReady || !formattedPath || formattedPath.length === 0) return

    const bounds = new window.google.maps.LatLngBounds()
    formattedPath.forEach((point) => bounds.extend(point))
    if (origin?.lat && origin?.lng) bounds.extend({ lat: Number(origin.lat), lng: Number(origin.lng) })
    if (destination?.lat && destination?.lng) bounds.extend({ lat: Number(destination.lat), lng: Number(destination.lng) })
    if (stops && stops.length > 0) {
      stops.forEach((stop) => bounds.extend({ lat: Number(stop.lat), lng: Number(stop.lng) }))
    }
    mapRef.current.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 })
  }, [formattedPath, origin, destination, stops, mapReady])

  const handleLoad = (map) => {
    mapRef.current = map
    setMapReady(true)
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
        {mapReady && origin?.lat && origin?.lng && (
          <MarkerF
            position={{ lat: Number(origin.lat), lng: Number(origin.lng) }}
            title="Origen"
            label="A"
          />
        )}
        {mapReady && destination?.lat && destination?.lng && (
          <MarkerF
            position={{ lat: Number(destination.lat), lng: Number(destination.lng) }}
            title="Destino"
            label="B"
          />
        )}
        {mapReady && stops && stops.map((stop, i) => (
          <MarkerF
            key={`stop-${i}-${stop.lat}-${stop.lng}`}
            position={{ lat: Number(stop.lat), lng: Number(stop.lng) }}
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
        {mapReady && formattedPath && formattedPath.length > 0 && (
          <PolylineF
            key={`route-polyline-${formattedPath.length}`}
            path={formattedPath}
            options={{
              strokeColor: '#2563EB',
              strokeWeight: 6,
              strokeOpacity: 0.9,
            }}
          />
        )}
      </GoogleMap>
    </div>
  )
}

export default GoogleMapRoute
