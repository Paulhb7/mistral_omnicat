'use client';
import { useEffect, useRef } from 'react';

// ── Types mirroring backend tool returns ────────────────────────────────────

export interface ClimateEvent {
  id: string;
  title: string;
  category: string;
  category_id?: string;
  date: string | null;
  lat: number | null;
  lng: number | null;
}

export interface Earthquake {
  magnitude: number;
  place: string;
  lat: number;
  lng: number;
  depth_km: number;
  date: string;
}

export interface ConflictEvent {
  date: string;
  type: string;
  location: string;
  fatalities: number;
  lat: number | null;
  lng: number | null;
}

interface EarthMapProps {
  center: { lat: number; lng: number; name: string } | null;
  climateEvents?: ClimateEvent[];
  earthquakes?: Earthquake[];
  conflicts?: ConflictEvent[];
  style?: React.CSSProperties;
}

// ── Category colours ────────────────────────────────────────────────────────

const CATEGORY_COLOUR: Record<string, string> = {
  'Wildfires':        '#ff3300',
  'Severe Storms':    '#00b4d8',
  'Floods':           '#0077b6',
  'Volcanoes':        '#ff6d00',
  'Drought':          '#f4a261',
  'Sea and Lake Ice': '#90e0ef',
  'Landslides':       '#a78bfa',
  'Dust and Haze':    '#e9c46a',
};

function categoryColour(cat: string): string {
  return CATEGORY_COLOUR[cat] ?? '#fa500f';
}

// ── Pulse CSS injected once ─────────────────────────────────────────────────

let cssInjected = false;
function ensureCSS() {
  if (cssInjected || typeof document === 'undefined') return;
  cssInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes catPulse {
      0%   { transform: scale(0.6); opacity: 0.8; }
      70%  { transform: scale(2.4); opacity: 0; }
      100% { transform: scale(2.4); opacity: 0; }
    }
    .cat-pulse-ring {
      position: absolute;
      border-radius: 50%;
      animation: catPulse 2s ease-out infinite;
      pointer-events: none;
    }
    .leaflet-container { background: #0d0d0f !important; }
    .leaflet-popup-content-wrapper {
      background: #1a1a1e !important;
      border: 1px solid rgba(255,250,235,0.12) !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }
    .leaflet-popup-tip { background: #1a1a1e !important; }
  `;
  document.head.appendChild(style);
}

// ── Marker factories ────────────────────────────────────────────────────────

function makePulseIcon(L: typeof import('leaflet'), colour: string, size = 10) {
  const s = size;
  return L.divIcon({
    className: '',
    iconSize: [s * 4, s * 4],
    iconAnchor: [s * 2, s * 2],
    html: `
      <div style="position:relative;width:${s*4}px;height:${s*4}px;display:flex;align-items:center;justify-content:center;">
        <div class="cat-pulse-ring" style="width:${s}px;height:${s}px;border:2px solid ${colour};top:50%;left:50%;margin:${-s/2}px 0 0 ${-s/2}px;animation-delay:0s;"></div>
        <div class="cat-pulse-ring" style="width:${s}px;height:${s}px;border:2px solid ${colour};top:50%;left:50%;margin:${-s/2}px 0 0 ${-s/2}px;animation-delay:0.6s;"></div>
        <div style="width:${s/2}px;height:${s/2}px;border-radius:50%;background:${colour};position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);"></div>
      </div>
    `,
  });
}

function makeQuakeIcon(L: typeof import('leaflet'), mag: number) {
  const r = Math.max(6, Math.min(28, mag * 5));
  const colour = mag >= 6 ? '#ff3300' : mag >= 4 ? '#f4a261' : 'rgba(255,250,235,0.5)';
  return L.divIcon({
    className: '',
    iconSize: [r * 2, r * 2],
    iconAnchor: [r, r],
    html: `<div style="width:${r*2}px;height:${r*2}px;border-radius:50%;background:${colour};opacity:0.55;border:1px solid ${colour};"></div>`,
  });
}

function makeCenterIcon(L: typeof import('leaflet')) {
  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `
      <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
        <div class="cat-pulse-ring" style="width:14px;height:14px;border:2px solid #fa500f;top:50%;left:50%;margin:-7px 0 0 -7px;animation-delay:0s;"></div>
        <div class="cat-pulse-ring" style="width:14px;height:14px;border:2px solid #fa500f;top:50%;left:50%;margin:-7px 0 0 -7px;animation-delay:0.8s;"></div>
        <div style="width:6px;height:6px;border-radius:50%;background:#fa500f;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);"></div>
      </div>
    `,
  });
}

// ── Main component ──────────────────────────────────────────────────────────

export default function EarthMap({ center, climateEvents, earthquakes, conflicts, style }: EarthMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<import('leaflet').Map | null>(null);
  const layerRef     = useRef<import('leaflet').LayerGroup | null>(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    ensureCSS();

    import('leaflet').then(L => {
      if (!containerRef.current) return;
      // @ts-expect-error leaflet internal
      if (containerRef.current._leaflet_id) {
        // @ts-expect-error leaflet internal
        delete containerRef.current._leaflet_id;
      }
      if (mapRef.current) return;

      // @ts-expect-error leaflet internal
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel  = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const map = L.map(containerRef.current!, {
        center: [20, 15],
        zoom: 2,
        zoomControl: false,
        attributionControl: false,
        minZoom: 1,
        maxZoom: 10,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd', maxZoom: 19,
      }).addTo(map);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd', maxZoom: 19, opacity: 0.45,
      }).addTo(map);

      L.control.attribution({ prefix: false, position: 'bottomright' })
        .addAttribution('<span style="color:rgba(255,250,235,0.12);font-size:8px">\u00a9 CartoDB \u00b7 OpenStreetMap</span>')
        .addTo(map);

      const layer = L.layerGroup().addTo(map);
      mapRef.current   = map;
      layerRef.current = layer;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current   = null;
      layerRef.current = null;
      if (containerRef.current) {
        // @ts-expect-error leaflet internal
        delete containerRef.current._leaflet_id;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers whenever data changes
  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;

    import('leaflet').then(L => {
      layerRef.current!.clearLayers();

      const mono = "'Roboto Mono', monospace";
      const popupStyle = `font-family:${mono};font-size:10px;color:#fffaeb;background:#1a1a1e;border:1px solid rgba(255,250,235,0.12);padding:8px 10px;border-radius:0;box-shadow:none;`;

      // Center marker
      if (center) {
        const icon = makeCenterIcon(L);
        L.marker([center.lat, center.lng], { icon })
          .bindPopup(`<div style="${popupStyle}"><b style="color:#fa500f;letter-spacing:2px;">${center.name.toUpperCase()}</b><br/>${center.lat.toFixed(4)}\u00b0N \u00b7 ${center.lng.toFixed(4)}\u00b0E</div>`, { className: 'cat-popup' })
          .addTo(layerRef.current!);
        mapRef.current!.flyTo([center.lat, center.lng], 5, { duration: 1.4 });
      }

      // Climate events
      for (const ev of climateEvents ?? []) {
        if (ev.lat == null || ev.lng == null) continue;
        const colour = categoryColour(ev.category);
        const icon   = makePulseIcon(L, colour, 8);
        L.marker([ev.lat, ev.lng], { icon })
          .bindPopup(`<div style="${popupStyle}"><b style="color:${colour};letter-spacing:2px;">${ev.category.toUpperCase()}</b><br/>${ev.title}<br/><span style="color:rgba(255,250,235,0.4)">${ev.date ?? ''}</span></div>`, { className: 'cat-popup' })
          .addTo(layerRef.current!);
      }

      // Earthquakes
      for (const q of earthquakes ?? []) {
        if (q.lat == null || q.lng == null) continue;
        const icon = makeQuakeIcon(L, q.magnitude ?? 0);
        L.marker([q.lat, q.lng], { icon })
          .bindPopup(`<div style="${popupStyle}"><b style="color:#f4a261;letter-spacing:2px;">M${q.magnitude} QUAKE</b><br/>${q.place}<br/><span style="color:rgba(255,250,235,0.4)">Depth ${q.depth_km} km \u00b7 ${q.date}</span></div>`, { className: 'cat-popup' })
          .addTo(layerRef.current!);
      }

      // Conflict events
      for (const c of conflicts ?? []) {
        if (c.lat == null || c.lng == null) continue;
        const icon = makePulseIcon(L, '#ff0055', 7);
        L.marker([c.lat, c.lng], { icon })
          .bindPopup(`<div style="${popupStyle}"><b style="color:#ff0055;letter-spacing:2px;">${c.type.toUpperCase()}</b><br/>${c.location}<br/><span style="color:rgba(255,250,235,0.4)">${c.fatalities} fatalities \u00b7 ${c.date}</span></div>`, { className: 'cat-popup' })
          .addTo(layerRef.current!);
      }
    });
  }, [center, climateEvents, earthquakes, conflicts]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute', inset: 0,
        background: '#0d0d0f',
        ...style,
      }}
    />
  );
}
