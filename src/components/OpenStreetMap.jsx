import { useEffect, useRef } from 'react'
import L from 'leaflet'

/**
 * OpenStreetMap — Leaflet canvas with no API key required.
 *
 * Props:
 *   origin        { lat, lng }   — start marker (A)
 *   destination   { lat, lng }   — end marker (B)
 *   routePath     [{ lat, lng }] — decoded polyline from Google Directions via Edge Function
 *   routeBounds   { northeast: { lat, lng }, southwest: { lat, lng } } — fitBounds target
 *   onRouteCalculated (legacy, unused when routePath provided)
 */
const OpenStreetMap = ({ origin, destination, routePath, routeBounds }) => {
  const mapRef        = useRef(null)
  const mapInstanceRef = useRef(null)
  const tileLayerRef  = useRef(null)
  const polylineRef   = useRef(null)
  const markerARef    = useRef(null)
  const markerBRef    = useRef(null)

  // ── Initialize map once ───────────────────────────────────────────────────
  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return

    mapInstanceRef.current = L.map(mapRef.current, { zoomControl: true }).setView([25.7617, -80.1918], 10)

    tileLayerRef.current = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      crossOrigin: true,
    })
    tileLayerRef.current.addTo(mapInstanceRef.current)

    mapInstanceRef.current.whenReady(() => {
      requestAnimationFrame(() => mapInstanceRef.current?.invalidateSize())
    })

    return () => {
      if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null }
      if (markerARef.current)  { markerARef.current.remove();  markerARef.current = null }
      if (markerBRef.current)  { markerBRef.current.remove();  markerBRef.current = null }
      if (tileLayerRef.current) { tileLayerRef.current.remove(); tileLayerRef.current = null }
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null }
    }
  }, [])

  // ── Marker icon factory ───────────────────────────────────────────────────
  const makeMarker = (label) =>
    L.divIcon({
      className: '',
      html: `<div class="lx-marker">${label}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    })

  // ── Update origin marker ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return
    if (markerARef.current) { markerARef.current.remove(); markerARef.current = null }
    if (origin?.lat && origin?.lng) {
      markerARef.current = L.marker([origin.lat, origin.lng], { icon: makeMarker('A') })
        .addTo(mapInstanceRef.current)
    }
  }, [origin])

  // ── Update destination marker ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return
    if (markerBRef.current) { markerBRef.current.remove(); markerBRef.current = null }
    if (destination?.lat && destination?.lng) {
      markerBRef.current = L.marker([destination.lat, destination.lng], { icon: makeMarker('B') })
        .addTo(mapInstanceRef.current)
    }
  }, [destination])

  // ── Render route polyline + fitBounds ─────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return

    // Remove old polyline
    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null }

    if (routePath && routePath.length > 1) {
      const latLngs = routePath.map((p) => [p.lat, p.lng])
      polylineRef.current = L.polyline(latLngs, {
        color: '#1E40AF',
        weight: 5,
        opacity: 0.85,
      }).addTo(mapInstanceRef.current)

      // Fit to explicit bounds if provided, otherwise fit to the polyline itself
      if (routeBounds?.northeast && routeBounds?.southwest) {
        mapInstanceRef.current.fitBounds(
          [
            [routeBounds.southwest.lat, routeBounds.southwest.lng],
            [routeBounds.northeast.lat, routeBounds.northeast.lng],
          ],
          { padding: [40, 40] }
        )
      } else {
        mapInstanceRef.current.fitBounds(polylineRef.current.getBounds(), { padding: [40, 40] })
      }
    } else if (origin?.lat && destination?.lat) {
      // No polyline yet but both markers exist — fit to them
      const bounds = L.latLngBounds(
        [origin.lat, origin.lng],
        [destination.lat, destination.lng]
      )
      mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60] })
    }
  }, [routePath, routeBounds, origin, destination])

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full rounded-lg overflow-hidden" />
      <style>{`
        .lx-marker {
          background-color: #1E3A8A;
          color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 13px;
          border: 2px solid #fff;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.45);
          width: 30px;
          height: 30px;
        }
        /* Hide leaflet attribution on small screens */
        .leaflet-control-attribution {
          font-size: 9px;
          opacity: 0.6;
        }
      `}</style>
    </div>
  )
}

export default OpenStreetMap
