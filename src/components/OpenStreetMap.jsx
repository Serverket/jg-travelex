import { useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'

const OpenStreetMap = ({ origin, destination, onRouteCalculated }) => {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const routingControlRef = useRef(null)
  const routingThemeObserverRef = useRef(null)

  const applyDarkThemeToRouting = useCallback(() => {
    const mapContainer = mapInstanceRef.current?.getContainer()
    if (!mapContainer) return

    const opaqueSelectors = [
      '.leaflet-routing-container',
      '.leaflet-routing-container .leaflet-routing-geocoders',
      '.leaflet-routing-container .leaflet-routing-alt',
      '.leaflet-routing-result',
      '.leaflet-routing-geocoder-result',
      '.leaflet-control-geocoder',
      '.leaflet-control-geocoder-alternatives',
      '.leaflet-control-geocoder-alternatives ul',
      '.leaflet-control-geocoder-alternatives li',
      '.leaflet-control-geocoder-alternatives .leaflet-control-geocoder-alternatives-item'
    ]

    opaqueSelectors.forEach((selector) => {
      mapContainer.querySelectorAll(selector).forEach((element) => {
        element.style.backgroundColor = '#020617'
        element.style.borderColor = 'rgba(148, 163, 184, 0.22)'
        element.style.boxShadow = '0 20px 45px rgba(15, 23, 42, 0.55)'
        element.style.color = '#f8fafc'
      })
    })

    mapContainer.querySelectorAll('.leaflet-routing-geocoder input,.leaflet-control-geocoder input').forEach((input) => {
      input.style.backgroundColor = 'rgba(15, 23, 42, 0.92)'
      input.style.borderColor = 'rgba(148, 163, 184, 0.3)'
      input.style.color = '#f8fafc'
    })

    mapContainer.querySelectorAll('.leaflet-control-geocoder-alternatives li + li,.leaflet-routing-alt .leaflet-routing-alt-line,.leaflet-routing-result + .leaflet-routing-result').forEach((element) => {
      element.style.borderTop = '1px solid rgba(148, 163, 184, 0.18)'
    })

    mapContainer.querySelectorAll('.leaflet-control-geocoder-alternatives li').forEach((item) => {
      if (!item.dataset.darkThemeBound) {
        item.dataset.darkThemeBound = 'true'
        item.addEventListener('mouseenter', () => {
          item.style.backgroundColor = 'rgba(30, 64, 175, 0.35)'
        })
        item.addEventListener('mouseleave', () => {
          item.style.backgroundColor = '#020617'
        })
      }
    })
  }, [])

  // Inicializar el mapa
  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current) {
      // Crear instancia del mapa
      mapInstanceRef.current = L.map(mapRef.current).setView([37.7749, -122.4194], 10)

      // Añadir capa de OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstanceRef.current)

      applyDarkThemeToRouting()

      const observer = new MutationObserver(() => applyDarkThemeToRouting())
      observer.observe(mapInstanceRef.current.getContainer(), { childList: true, subtree: true })
      routingThemeObserverRef.current = observer
    }

    // Limpiar al desmontar
    return () => {
      if (routingControlRef.current) {
        routingControlRef.current.remove()
        routingControlRef.current = null
      }
      
      if (mapInstanceRef.current) {
        routingThemeObserverRef.current?.disconnect()
        routingThemeObserverRef.current = null
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [applyDarkThemeToRouting])

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

    applyDarkThemeToRouting()

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