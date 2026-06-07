import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet-routing-machine'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'

const OpenStreetMap = ({ origin, destination, onRouteCalculated }) => {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const routingControlRef = useRef(null)
  const tileLayerRef = useRef(null)
  const onRouteCalculatedRef = useRef(onRouteCalculated)

  // Keep the latest callback in a ref so the event listener
  // inside the one-time mount effect always calls the current one.
  onRouteCalculatedRef.current = onRouteCalculated

  // Initialize the map once
  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current) {
      // Create instance of the map
      mapInstanceRef.current = L.map(mapRef.current).setView([37.7749, -122.4194], 10)

      // Add OpenStreetMap tile layer
      tileLayerRef.current = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        crossOrigin: true
      })

      tileLayerRef.current.on('tileerror', (event) => {
        console.error('Error loading OpenStreetMap tile:', event?.tile?.src || event)
      })

      tileLayerRef.current.addTo(mapInstanceRef.current)

      // Create routing control once (waypoints will be updated later)
      try {
        routingControlRef.current = L.Routing.control({
          waypoints: [],
          routeWhileDragging: false,
          showAlternatives: false,
          fitSelectedRoutes: true,
          addWaypoints: false,
          draggableWaypoints: false,
          lineOptions: {
            styles: [{ color: '#1E40AF', weight: 5 }]
          },
          createMarker: function (i, waypoint) {
            return L.marker(waypoint.latLng, {
              icon: L.divIcon({
                className: 'custom-marker',
                html: `<div class="marker-label">${i === 0 ? 'A' : 'B'}</div>`,
                iconSize: [30, 30]
              })
            })
          }
        }).addTo(mapInstanceRef.current)

        // Listen for found routes
        routingControlRef.current.on('routesfound', (e) => {
          // Guard: ignore if map has been destroyed
          if (!mapInstanceRef.current) return
          const routes = e.routes
          if (routes && routes.length > 0) {
            const route = routes[0]
            const distanceInMiles = route.summary.totalDistance / 1609.34
            const durationInSeconds = route.summary.totalTime

            if (onRouteCalculatedRef.current) {
              onRouteCalculatedRef.current({
                distance: distanceInMiles.toFixed(2),
                duration: durationInSeconds
              })
            }
          }
        })
      } catch (err) {
        console.error('Error initializing routing control:', err)
      }

      mapInstanceRef.current.whenReady(() => {
        requestAnimationFrame(() => {
          mapInstanceRef.current?.invalidateSize()
        })
      })
    }

    // Cleanup on unmount
    return () => {
      if (routingControlRef.current) {
        try {
          routingControlRef.current.remove()
        } catch (error) {
          // Ignore errors during cleanup
        }
        routingControlRef.current = null
      }

      if (tileLayerRef.current) {
        tileLayerRef.current.off('tileerror')
        if (mapInstanceRef.current?.hasLayer(tileLayerRef.current)) {
          mapInstanceRef.current.removeLayer(tileLayerRef.current)
        }
        tileLayerRef.current = null
      }

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update waypoints when origin or destination change
  useEffect(() => {
    if (!mapInstanceRef.current || !routingControlRef.current) return
    if (!origin || !destination) return

    try {
      routingControlRef.current.setWaypoints([
        L.latLng(origin.lat, origin.lng),
        L.latLng(destination.lat, destination.lng)
      ])
    } catch (error) {
      console.error('Error updating waypoints:', error)
    }
  }, [origin, destination])

  return (
    <div className="relative">
      <div ref={mapRef} className="h-96 w-full rounded overflow-hidden" />
      <style>{`
        .leaflet-container .custom-marker {
          background-color: #1E3A8A;
          color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          border: 2px solid #fff;
          box-shadow: 0 8px 16px rgba(15, 23, 42, 0.35);
          width: 30px;
          height: 30px;
          line-height: 30px;
        }
        .leaflet-routing-container,
        .leaflet-routing-container .leaflet-routing-geocoders,
        .leaflet-routing-container .leaflet-routing-alt,
        .leaflet-routing-result {
          background-color: #fff !important;
          color: #111827 !important;
          border-color: rgba(15, 23, 42, 0.12) !important;
        }
        .leaflet-routing-container .leaflet-routing-alt * {
          color: #1f2937 !important;
        }
        .leaflet-routing-container .leaflet-routing-collapse-btn {
          color: #1f2937 !important;
        }
      `}</style>
    </div>
  )
}

export default OpenStreetMap
