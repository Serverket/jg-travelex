/**
 * MapBackground.jsx — Animated US Urban Route Background
 * Drop into any React Vite PWA. No HUD. Both pins always visible.
 * Routes sourced from OSRM (real OSM geometry). Regenerate: node fetch-routes.mjs
 *
 * Usage:
 *   <MapBackground />
 *   <MapBackground><LoginForm /></MapBackground>
 *
 * Peer dep: npm install leaflet
 */

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ROUTES, resampleRoute } from './routes.js';

const DURATION_MS = 10_000;
const CYAN        = '#00f2fe';
const MAGENTA     = '#f0006e';
const PIN_CSS     = `@keyframes pinP{0%{transform:scale(.85);opacity:.9}100%{transform:scale(2.6);opacity:0}}`;

function makePinIcon(letter, label, color) {
  const title = letter === 'A' ? 'ORIGIN' : 'DESTINATION';
  return L.divIcon({
    className: '',
    html: `
      <div style="width:200px;display:flex;flex-direction:column;align-items:center;pointer-events:none">
        <div style="width:28px;height:28px;border-radius:50%;background:${color};
                    border:2.5px solid rgba(255,255,255,.85);display:flex;align-items:center;
                    justify-content:center;font:700 12px/1 'Fira Code',monospace;color:#04070f;
                    box-shadow:0 0 18px ${color};position:relative;flex-shrink:0">
          ${letter}
          <span style="position:absolute;inset:-2px;border-radius:50%;border:2px solid ${color};
                       animation:pinP 2.2s ease-out infinite"></span>
        </div>
        <div style="margin-top:5px;padding:4px 10px;border-radius:7px;border:1px solid ${color};
                    background:rgba(4,7,15,.92);backdrop-filter:blur(12px);
                    font:400 10px/1.4 'Inter',sans-serif;white-space:nowrap;color:#fff">
          <span style="font:700 9px/1 'Fira Code',monospace;letter-spacing:.8px;
                       color:${color};display:block;margin-bottom:2px">${title}</span>
          ${label}
        </div>
      </div>`,
    iconSize:   [200, 65],
    iconAnchor: [100, 14], // center of the 28px circle = exact route endpoint
  });
}

export default function MapBackground({ children, routeIndex = null }) {
  const divRef   = useRef(null);
  const aliveRef = useRef(false);
  const loadRef  = useRef(null);
  const routeIdxRef = useRef(0);

  useEffect(() => {
    if (!divRef.current || aliveRef.current) return;
    aliveRef.current = true;

    const map = L.map(divRef.current, {
      zoomControl: false, attributionControl: false,
      dragging: false, keyboard: false,
      scrollWheelZoom: false, doubleClickZoom: false,
      boxZoom: false, touchZoom: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd', maxZoom: 19,
    }).addTo(map);

    let glow, core, progG, progC, pinA, pinB, raf, ts0;
    let idx = 0, pts = [];

    function preload(route) {
      const z = Math.round(map.getZoom() || 14);
      const lats = route.waypoints.map(w => w[0]);
      const lngs = route.waypoints.map(w => w[1]);
      const l2t  = l => Math.floor((l+180)/360*2**z);
      const la2t = l => Math.floor((1-Math.log(Math.tan(l*Math.PI/180)+1/Math.cos(l*Math.PI/180))/Math.PI)/2*2**z);
      const subs = ['a','b','c','d']; let n = 0;
      for (let x = l2t(Math.min(...lngs)-.02); x <= l2t(Math.max(...lngs)+.02); x++)
        for (let y = la2t(Math.max(...lats)+.02); y <= la2t(Math.min(...lats)-.02); y++) {
          const img = new Image();
          img.src = `https://${subs[n++%4]}.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`;
        }
    }

    function load(i) {
      cancelAnimationFrame(raf);
      idx = i;
      routeIdxRef.current = i;
      const route = ROUTES[i % ROUTES.length];
      pts = resampleRoute(route.waypoints, 10);
      const allLL = pts.map(p => [p.lat, p.lng]);

      // OSRM snapped endpoints — pins placed HERE exactly
      const wpA = route.waypoints[0];
      const wpB = route.waypoints[route.waypoints.length - 1];

      [glow, core, progG, progC, pinA, pinB].forEach(l => l?.remove());

      glow  = L.polyline(allLL, { color:CYAN,  weight:14, opacity:.18, lineCap:'round', lineJoin:'round' }).addTo(map);
      core  = L.polyline(allLL, { color:'#fff',weight:3,  opacity:.28, lineCap:'round', lineJoin:'round' }).addTo(map);
      progG = L.polyline([],    { color:CYAN,  weight:14, opacity:.55, lineCap:'round', lineJoin:'round' }).addTo(map);
      progC = L.polyline([],    { color:'#fff',weight:3.5,opacity:.95, lineCap:'round', lineJoin:'round' }).addTo(map);

      // Pin A at first OSRM node, Pin B at last OSRM node
      pinA = L.marker([wpA[0], wpA[1]], { icon: makePinIcon('A', route.pinA, CYAN),    zIndexOffset: 2000 }).addTo(map);
      pinB = L.marker([wpB[0], wpB[1]], { icon: makePinIcon('B', route.pinB, MAGENTA), zIndexOffset: 2000 }).addTo(map);

      const p = route.padding || 60;
      map.fitBounds(L.latLngBounds(allLL), {
        paddingTopLeft: [p, p+30], paddingBottomRight: [p, p], animate: false,
      });

      setTimeout(() => preload(ROUTES[(i+1) % ROUTES.length]), 800);
      ts0 = null;
      raf = requestAnimationFrame(tick);
    }

    function tick(ts) {
      if (!ts0) ts0 = ts;
      const progress = Math.min((ts - ts0) / DURATION_MS, 1);
      const end   = Math.max(2, Math.round(progress * (pts.length - 1)));
      const slice = pts.slice(0, end + 1).map(p => [p.lat, p.lng]);
      progG.setLatLngs(slice);
      progC.setLatLngs(slice);
      if (progress >= 1) {
        if (routeIndex === null) {
          setTimeout(() => load((idx+1) % ROUTES.length), 700);
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    }

    loadRef.current = load;
    load(0);

    return () => {
      cancelAnimationFrame(raf);
      map.remove();
      aliveRef.current = false;
      loadRef.current = null;
    };
  }, []);

  // External control: when routeIndex changes, load that route
  useEffect(() => {
    if (routeIndex !== null && loadRef.current && aliveRef.current) {
      if (routeIdxRef.current !== routeIndex) {
        loadRef.current(routeIndex);
      }
    }
  }, [routeIndex]);

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', overflow:'hidden', background:'#04070f', userSelect:'none' }}>
      <style>{PIN_CSS}</style>
      {/* Oversized wrapper: fills viewport corners after perspective rotateX */}
      <div style={{ position:'absolute', top:'-35%', left:'-25%', width:'150%', height:'170%',
                    transform:'perspective(1100px) rotateX(40deg)', transformOrigin:'50% 38%', zIndex:0 }}>
        <div ref={divRef} style={{ width:'100%', height:'100%', background:'#04070f' }} />
      </div>
      {/* Vignette */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:5,
                    background:'radial-gradient(ellipse 90% 85% at 50% 50%,transparent 20%,rgba(4,7,15,.45) 62%,rgba(4,7,15,.92) 100%)' }} />
      {children && (
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:15 }}>
          {children}
        </div>
      )}
    </div>
  );
}
