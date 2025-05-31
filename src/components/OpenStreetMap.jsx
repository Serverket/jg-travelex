import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'

const OpenStreetMap = ({ origin, destination, onRouteCalculated }) => {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const routingControlRef = useRef(null)

  // Inicializar el mapa
  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current) {
      // Crear instancia del mapa
      mapInstanceRef.current = L.map(mapRef.current).setView([37.7749, -122.4194], 10)

      // Añadir capa de OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstanceRef.current)
    }

    // Limpiar al desmontar
    return () => {
      if (routingControlRef.current) {
        routingControlRef.current.remove()
        routingControlRef.current = null
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
      routingControlRef.current.remove()
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
      createMarker: function(i, waypoint) {
        return L.marker(waypoint.latLng, {
          icon: L.divIcon({
            className: 'custom-marker',
            html: `<div class="marker-label">${i === 0 ? 'A' : 'B'}</div>`,
            iconSize: [30, 30]
          })
        })
      }
    }).addTo(mapInstanceRef.current)

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
      <style jsx>{`
        .custom-marker {
          background-color: #1E40AF;
          color: white;
          border-radius: 50%;
          text-align: center;
          line-height: 30px;
        }
        .marker-label {
          font-weight: bold;
        }
      `}</style>
    </div>
  )
}

export default OpenStreetMap