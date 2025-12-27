import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet-routing-machine'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'

const OpenStreetMap = ({ origin, destination, onRouteCalculated }) => {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const routingControlRef = useRef(null)
  const tileLayerRef = useRef(null)

  // Inicializar el mapa
  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current) {
      // Crear instancia del mapa
      mapInstanceRef.current = L.map(mapRef.current).setView([37.7749, -122.4194], 10)

      // Añadir capa de OpenStreetMap
      tileLayerRef.current = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        crossOrigin: true
      })

      tileLayerRef.current.on('tileerror', (event) => {
        console.error('Error loading OpenStreetMap tile:', event?.tile?.src || event)
      })

      tileLayerRef.current.addTo(mapInstanceRef.current)

      mapInstanceRef.current.whenReady(() => {
        requestAnimationFrame(() => {
          mapInstanceRef.current?.invalidateSize()
        })
      })
    }

    // Limpiar al desmontar
    return () => {
      if (routingControlRef.current) {
        try {
          routingControlRef.current.remove()
        } catch (error) {
          console.warn('Error removing routing control:', error)
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

  // Calcular ruta cuando cambian origen o destino
  useEffect(() => {
    if (!mapInstanceRef.current || !origin || !destination) return

    // Eliminar ruta anterior si existe
    if (routingControlRef.current) {
      try {
        routingControlRef.current.remove()
      } catch (error) {
        console.warn('Error removing existing routing control:', error)
      }
      routingControlRef.current = null
    }

    // Crear nueva ruta
    routingControlRef.current = L.Routing.control({
      waypoints: [
        L.latLng(origin.lat, origin.lng),
        L.latLng(destination.lat, destination.lng)
      ],
      routeWhileDragging: false,
      showAlternatives: false,
      fitSelectedRoutes: true,
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

    requestAnimationFrame(() => {
      mapInstanceRef.current?.invalidateSize()
    })

    // Escuchar evento de ruta calculada
    routingControlRef.current.on('routesfound', (e) => {
      const routes = e.routes
      if (routes && routes.length > 0) {
        const route = routes[0]
        
        // Convertir metros a millas y segundos a minutos
        const distanceInMiles = route.summary.totalDistance / 1609.34
        const durationInSeconds = route.summary.totalTime
        
        // Notificar al componente padre
        if (onRouteCalculated) {
          onRouteCalculated({
            distance: distanceInMiles.toFixed(2),
            duration: durationInSeconds
          })
        }
      }
    })
  }, [origin, destination, onRouteCalculated])

  return (
    <div className="relative">
      <div ref={mapRef} className="h-96 w-full rounded overflow-hidden" />
      <style>{`
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