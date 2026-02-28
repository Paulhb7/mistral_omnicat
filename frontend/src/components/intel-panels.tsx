'use client';

import type { PanelData, LocationData } from '@/hooks/use-chat';

const CATS: Record<string, { label: string; color: string }> = {
  wildfires:     { label: 'Wildfires',   color: '#ff4500' },
  severeStorms:  { label: 'Storms',      color: '#00b4d8' },
  floods:        { label: 'Floods',      color: '#4361ee' },
  earthquakes:   { label: 'Earthquakes', color: '#ffd60a' },
  volcanoes:     { label: 'Volcanoes',   color: '#e63946' },
  seaAndLakeIce: { label: 'Ice',         color: '#90e0ef' },
  drought:       { label: 'Drought',     color: '#e9c46a' },
  landslides:    { label: 'Landslides',  color: '#a8763e' },
  dustHaze:      { label: 'Dust / Haze', color: '#d4a017' },
  snow:          { label: 'Snow',        color: '#caf0f8' },
  manmade:       { label: 'Manmade',     color: '#c77dff' },
  'Wildfires':   { label: 'Wildfires',   color: '#ff4500' },
  'Severe Storms': { label: 'Storms',    color: '#00b4d8' },
  'Floods':      { label: 'Floods',      color: '#4361ee' },
  'Volcanoes':   { label: 'Volcanoes',   color: '#e63946' },
  'Sea and Lake Ice': { label: 'Ice',    color: '#90e0ef' },
  'Drought':     { label: 'Drought',     color: '#e9c46a' },
  'Landslides':  { label: 'Landslides',  color: '#a8763e' },
  'Dust and Haze': { label: 'Dust / Haze', color: '#d4a017' },
};

function riskLevel(nEvents: number, maxMag: number): { label: string; color: string } {
  if (nEvents > 10 || maxMag >= 6) return { label: 'HIGH',     color: '#ff4500' };
  if (nEvents > 4  || maxMag >= 4) return { label: 'MODERATE', color: '#ffd60a' };
  if (nEvents > 0  || maxMag >= 2) return { label: 'LOW',      color: '#00b4d8' };
  return { label: 'NONE', color: '#333' };
}

function getCat(id: string) {
  return CATS[id] ?? { label: id, color: '#666' };
}

interface EarthPanelProps {
  panelData: PanelData;
  location: LocationData | null;
}

export function EarthPanel({ panelData, location }: EarthPanelProps) {
  const weather  = panelData.weather as { temperature_c: number; condition: string; wind_kmh: number; humidity_pct: number } | undefined;
  const climate  = panelData.climate as { events: Array<{ id: string; title: string; category: string; category_id: string; date: string }>; by_category: Record<string, string[]> } | undefined;
  const seismic  = panelData.earthquakes as { earthquakes: Array<{ magnitude: number; place: string; date: string; depth_km: number }> } | undefined;
  const news     = panelData.news as { articles: Array<{ title: string; url: string; source: string; date: string }> } | undefined;
  const conflict = panelData.conflict as { recent_events: Array<{ date: string; type: string; location: string; fatalities: number }> } | undefined;

  const nEvents = climate?.events?.length ?? 0;
  const maxMag  = seismic?.earthquakes?.reduce((m, q) => Math.max(m, q.magnitude ?? 0), 0) ?? 0;
  const risk    = riskLevel(nEvents, maxMag);

  return (
    <>
      {location && (
        <div style={{ padding: '0 16px 10px' }}>
          <span style={{ fontSize: 8, letterSpacing: 3, padding: '2px 8px', border: `1px solid ${risk.color}`, color: risk.color, textTransform: 'uppercase' }}>
            RISK \u00b7 {risk.label}
          </span>
        </div>
      )}

      {weather && (
        <>
          <CatHeader label="Weather" color="#4cc9f0" />
          <EventRow
            color="#4cc9f0"
            title={`${weather.temperature_c?.toFixed(1)}\u00b0C \u00b7 ${weather.condition}`}
            meta={`Wind ${weather.wind_kmh} km/h \u00b7 Humidity ${weather.humidity_pct}%`}
          />
        </>
      )}

      {climate && climate.events.length > 0 && Object.entries(
        climate.events.reduce<Record<string, typeof climate.events>>((acc, e) => {
          const key = e.category ?? e.category_id ?? 'unknown';
          if (!acc[key]) acc[key] = [];
          acc[key].push(e);
          return acc;
        }, {})
      ).map(([catId, events]) => {
        const cfg = getCat(catId);
        return (
          <div key={catId}>
            <CatHeader label={cfg.label} count={events.length} color={cfg.color} />
            {events.slice(0, 8).map(e => (
              <EventRow key={e.id} color={cfg.color} title={e.title} meta={e.date ?? ''} />
            ))}
          </div>
        );
      })}

      {seismic && seismic.earthquakes.length > 0 && (
        <>
          <CatHeader label="Seismic" count={seismic.earthquakes.length} color="#ffd60a" />
          {seismic.earthquakes.slice(0, 8).map((q, i) => {
            const mag = q.magnitude?.toFixed(1) ?? '?';
            const mc  = Number(mag) >= 5 ? '#ff4500' : Number(mag) >= 3.5 ? '#ffd60a' : '#555';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 16px' }}>
                <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', background: `${mc}22`, color: mc, borderRadius: 2, flexShrink: 0 }}>M{mag}</span>
                <div>
                  <div style={{ fontSize: 10, color: '#fffaeb', marginBottom: 2 }}>{q.place}</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,250,235,0.45)' }}>{q.date} \u00b7 {q.depth_km}km</div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {conflict && conflict.recent_events && conflict.recent_events.length > 0 && (
        <>
          <CatHeader label="Conflicts" count={conflict.recent_events.length} color="#ff0055" />
          {conflict.recent_events.slice(0, 8).map((c, i) => (
            <EventRow
              key={i}
              color="#ff0055"
              title={`${c.type} \u2014 ${c.location}`}
              meta={`${c.fatalities} fatalities \u00b7 ${c.date}`}
            />
          ))}
        </>
      )}

      {news && news.articles.length > 0 && (
        <>
          <CatHeader label="News Intel" count={news.articles.length} color="#a78bfa" />
          {news.articles.map((a, i) => (
            <div
              key={i}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 16px', cursor: 'pointer' }}
              onClick={() => window.open(a.url, '_blank')}
            >
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#a78bfa', flexShrink: 0, marginTop: 4, animation: 'pulse 2.5s ease-in-out infinite' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: '#fffaeb', lineHeight: 1.4, marginBottom: 2 }}>{a.title}</div>
                <div style={{ fontSize: 8, color: 'rgba(255,250,235,0.45)' }}>{a.source}{a.date ? ` \u00b7 ${a.date}` : ''}</div>
              </div>
            </div>
          ))}
        </>
      )}

      {nEvents === 0 && !maxMag && !news?.articles?.length && !conflict?.recent_events?.length && (
        <div style={{ padding: '20px 16px', fontSize: 10, color: 'rgba(255,250,235,0.45)' }}>No active events detected.</div>
      )}
    </>
  );
}

function CatHeader({ label, count, color }: { label: string; count?: number; color: string }) {
  return (
    <div style={{ padding: '8px 16px 4px', fontSize: 8, letterSpacing: 3, color, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span>{label}</span>
      {count !== undefined && (
        <span style={{ opacity: 0.6, fontSize: 8 }}>({count})</span>
      )}
      <div style={{ flex: 1, height: 1, background: 'rgba(255,250,235,0.08)' }} />
    </div>
  );
}

function EventRow({ color, title, meta }: { color: string; title: string; meta?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 16px' }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 4, animation: 'pulse 2.5s ease-in-out infinite' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: '#fffaeb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{title}</div>
        {meta && <div style={{ fontSize: 8, color: 'rgba(255,250,235,0.45)' }}>{meta}</div>}
      </div>
    </div>
  );
}
