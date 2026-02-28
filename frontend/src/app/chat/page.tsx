'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useChat } from '@/hooks/use-chat';
import { EarthPanel } from '@/components/intel-panels';
import { SearchBar } from '@/components/search-bar';
import { BriefingPanel } from '@/components/briefing-panel';

const EarthMap = dynamic(() => import('@/components/earth-map'), { ssr: false });

// ── Constants ────────────────────────────────────────────────────────────────

const SIDEBAR_W = 360;
const BRIEF_W = 380;

// NASA Eyes — hide UI chrome via query params
const UI_Q =
  '?featured=false&detailPanel=false&logo=false&search=false' +
  '&shareButton=false&menu=false&collapseSettingsOptions=true&hideFullScreenToggle=true';
const SOLAR_URL = 'https://eyes.nasa.gov/apps/solar-system/';
const SOLAR_DEFAULT = `${SOLAR_URL}#/earth${UI_Q}`;

type MapView = 'earth' | 'solar' | null;

// ── Celestial body detection ─────────────────────────────────────────────────
// keyword → NASA Eyes hash route (planets, moons, spacecraft)

const CELESTIAL: [string, string][] = [
  // Planets
  ['mercury', 'mercury'], ['venus', 'venus'], ['earth', 'earth'],
  ['mars', 'mars'], ['jupiter', 'jupiter'], ['saturn', 'saturn'],
  ['uranus', 'uranus'], ['neptune', 'neptune'], ['pluto', 'pluto'],
  ['sun', 'sun'],
  // Major moons
  ['moon', 'earths_moon'], ['titan', 'titan'], ['europa', 'europa'],
  ['ganymede', 'ganymede'], ['callisto', 'callisto'], ['io', 'io'],
  ['enceladus', 'enceladus'], ['triton', 'triton'],
  ['phobos', 'phobos'], ['deimos', 'deimos'], ['charon', 'charon'],
  // Spacecraft
  ['jwst', 'sc_jwst'], ['james webb', 'sc_jwst'],
  ['juno', 'sc_juno'], ['voyager 1', 'sc_voyager_1'], ['voyager 2', 'sc_voyager_2'],
  ['new horizons', 'sc_new_horizons'], ['parker', 'sc_parker_solar_probe'],
  ['europa clipper', 'sc_europa_clipper'], ['cassini', 'sc_cassini'],
  ['lucy', 'sc_lucy'], ['osiris', 'sc_osiris_rex'],
  ['iss', 'sc_iss'], ['hubble', 'sc_hubble'],
];

function detectCelestial(q: string): { id: string; label: string } | null {
  const low = q.toLowerCase();
  for (const [kw, id] of CELESTIAL) {
    if (low.includes(kw)) return { id, label: kw.toUpperCase() };
  }
  return null;
}

const TOOL_LABELS: Record<string, string> = {
  geocode_location:       'GEOCODE \u00b7 location',
  get_weather:            'OPEN-METEO \u00b7 weather',
  get_climate_events:     'NASA EONET \u00b7 climate',
  get_earthquakes:        'USGS \u00b7 seismic',
  get_news:               'GDELT \u00b7 news intel',
  get_conflict_events:    'ACLED \u00b7 conflict events',
  maritime_analyst:       'MARITIME \u00b7 analyst',
  aviation_analyst:       'AVIATION \u00b7 analyst',
  doomsday_analyst:       'DOOMSDAY \u00b7 analyst',
  conflict_analyst:       'CONFLICT \u00b7 analyst',
  solar_system_analyst:   'SOLAR \u00b7 analyst',
};

const mono = "'Roboto Mono', monospace";

// ── Main page ────────────────────────────────────────────────────────────────

export default function IntelPage() {
  const [inputVal, setInputVal]     = useState('');
  const [statusText, setStatusText] = useState('READY');
  const [isScanning, setIsScanning] = useState(false);
  const [briefingVisible, setBriefingVisible] = useState(false);

  // mapAgent persists across resets — only updated when agent_selected arrives.
  // Starts null (NASA Eyes on load), switches to 'earth' only on an Earth query.
  const [mapAgent, setMapAgent] = useState<MapView>(null);
  const [modeText, setModeText] = useState('SOLAR SYSTEM · EARTH');

  const inpRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { send, reset, isLoading, briefing, location, tools, panelData, error, agentMode } = useChat();

  // ── Search handler ─────────────────────────────────────────────────────────

  const handleSearch = useCallback(async (q: string) => {
    const text = q.trim();
    if (!text) return;

    setIsScanning(true);
    setStatusText('ROUTING . . .');
    setBriefingVisible(false);

    // Detect celestial body — fly directly to planet, moon, or spacecraft
    const target = detectCelestial(text);
    if (target) {
      setMapAgent('solar');
      setModeText(`SOLAR SYSTEM · ${target.label}`);
      const url = `${SOLAR_URL}#/${target.id}${UI_Q}`;
      try { iframeRef.current?.contentWindow?.location.replace(url); }
      catch { if (iframeRef.current) iframeRef.current.src = url; }
    }

    await send(text);
  }, [send]);

  const submitTextQuery = useCallback(() => {
    handleSearch(inputVal);
    setInputVal('');
  }, [handleSearch, inputVal]);

  // ── Sync mapAgent — only when a real agent is selected (never on reset) ───

  useEffect(() => {
    if (agentMode === 'solar_system') {
      // mapAgent + iframeSrc already set by handleSearch's detectPlanet;
      // only fallback to generic view if handleSearch didn't detect a planet
      setMapAgent(prev => prev === 'solar' ? prev : 'solar');
    } else if (agentMode !== null) {
      setMapAgent('earth');
    }
  }, [agentMode]);

  // ── Update mode text when location arrives ────────────────────────────────

  useEffect(() => {
    if (location && mapAgent === 'earth') {
      setModeText(`EARTH · ${location.name.toUpperCase()}`);
    }
  }, [location, mapAgent]);

  // ── Sync status from hook state ────────────────────────────────────────────

  useEffect(() => {
    if (isLoading) {
      setIsScanning(true);
      if (agentMode) setStatusText(`${agentMode.toUpperCase()} AGENT \u00b7 SCANNING . . .`);
      else setStatusText('ROUTING . . .');
    } else if (location) {
      setIsScanning(false);
      const ev = (panelData.climate as { total?: number } | undefined)?.total ?? 0;
      const qk = (panelData.earthquakes as { total?: number } | undefined)?.total ?? 0;
      const nw = (panelData.news as { total?: number } | undefined)?.total ?? 0;
      setStatusText(`${ev} EVENTS \u00b7 ${qk} QUAKES \u00b7 ${nw} NEWS`);
    } else if (!isLoading) {
      setIsScanning(false);
      if (tools.length > 0) setStatusText('COMPLETE');
      else setStatusText('READY');
    }
  }, [isLoading, location, panelData, agentMode, tools.length]);

  // ── Show briefing panel when briefing arrives ──────────────────────────────

  useEffect(() => {
    if (briefing) setBriefingVisible(true);
  }, [briefing]);

  // ── Derive panel state ─────────────────────────────────────────────────────

  const hasResults = !isLoading && !!location;
  const showEmpty = !isLoading && !hasResults && tools.length === 0;
  const showLoadingChips = isLoading || (tools.length > 0 && !hasResults);
  const showBriefingPanel = !!briefing && briefingVisible;

  return (
    <>
      {/* Background visualisation — Leaflet map (Earth) or NASA Eyes (Solar / idle) */}
      {mapAgent === 'earth' ? (
        <div style={{
          position: 'fixed', top: 56, left: SIDEBAR_W,
          width: showBriefingPanel ? `calc(100vw - ${SIDEBAR_W + BRIEF_W}px)` : `calc(100vw - ${SIDEBAR_W}px)`,
          height: 'calc(100vh - 56px)', zIndex: 0,
          transition: 'width 0.4s ease',
        }}>
          <EarthMap
            center={location}
            climateEvents={(panelData.climate as { events?: Array<{ id: string; title: string; category: string; category_id: string; date: string | null; lat: number | null; lng: number | null }> } | undefined)?.events}
            earthquakes={(panelData.earthquakes as { earthquakes?: Array<{ magnitude: number; place: string; lat: number; lng: number; depth_km: number; date: string }> } | undefined)?.earthquakes}
            conflicts={(panelData.conflict as { recent_events?: Array<{ date: string; type: string; location: string; fatalities: number; lat: number | null; lng: number | null }> } | undefined)?.recent_events}
          />
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          src={SOLAR_DEFAULT}
          style={{
            position: 'fixed', top: 56, left: SIDEBAR_W,
            width: showBriefingPanel ? `calc(100vw - ${SIDEBAR_W + BRIEF_W}px)` : `calc(100vw - ${SIDEBAR_W}px)`,
            height: 'calc(100vh - 56px)', border: 'none', zIndex: 0,
            display: 'block', transition: 'width 0.4s ease',
          }}
          allow="fullscreen"
          allowFullScreen
          title="NASA Eyes"
        />
      )}

      {/* HUD corners */}
      <div style={{ position: 'fixed', top: 64, right: 16, width: 14, height: 14, borderTop: '1px solid rgba(255,250,235,0.25)', borderRight: '1px solid rgba(255,250,235,0.25)', pointerEvents: 'none', zIndex: 75 }} />
      <div style={{ position: 'fixed', bottom: 16, right: 16, width: 14, height: 14, borderBottom: '1px solid rgba(255,250,235,0.25)', borderRight: '1px solid rgba(255,250,235,0.25)', pointerEvents: 'none', zIndex: 75 }} />

      {/* Navbar */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: '#111113', borderBottom: '1px solid rgba(255,250,235,0.08)', zIndex: 80, fontFamily: mono }}>
        <Link href="/" style={{ fontSize: 12, fontWeight: 600, letterSpacing: 4, color: '#fa500f', textDecoration: 'none' }}>
          Omni<strong>CAT</strong>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 9, letterSpacing: 3, color: 'rgba(255,250,235,0.35)', textTransform: 'uppercase' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fa500f', animation: 'pulse 1.6s ease-in-out infinite', flexShrink: 0 }} />
          {modeText}
          {agentMode && (
            <span style={{
              fontSize: 7, letterSpacing: 2, padding: '2px 7px',
              border: '1px solid rgba(250,80,15,0.4)',
              color: '#fa500f',
              textTransform: 'uppercase',
            }}>
              {agentMode.toUpperCase()} AGENT
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <Link href="/about" style={{ fontSize: 11, letterSpacing: 2, color: 'rgba(255,250,235,0.4)', textDecoration: 'none', textTransform: 'uppercase' }}>About</Link>
          <button
            onClick={() => {
              reset(); setBriefingVisible(false); setStatusText('READY'); setMapAgent(null); setModeText('SOLAR SYSTEM · EARTH');
              try { iframeRef.current?.contentWindow?.location.replace(SOLAR_DEFAULT); }
              catch { if (iframeRef.current) iframeRef.current.src = SOLAR_DEFAULT; }
            }}
            style={{ background: 'transparent', border: '1px solid rgba(255,250,235,0.08)', color: 'rgba(255,250,235,0.3)', fontFamily: mono, fontSize: 8, letterSpacing: 2, padding: '4px 10px', cursor: 'pointer', textTransform: 'uppercase' }}
          >
            RESET
          </button>
        </div>
      </nav>

      {/* Sidebar */}
      <div style={{ position: 'fixed', top: 56, left: 0, bottom: 0, width: SIDEBAR_W, background: '#111113', borderRight: '1px solid rgba(255,250,235,0.08)', display: 'flex', flexDirection: 'column', zIndex: 70, fontFamily: mono }}>

        {/* Content area */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Empty state */}
          {showEmpty && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '32px 24px', textAlign: 'center' }}>
              {/* Concentric rings */}
              <div style={{ position: 'relative', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(250,80,15,0.18)', animation: 'pulse 2.4s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', border: '1px solid rgba(250,80,15,0.35)', animation: 'pulse 2.4s ease-in-out infinite 0.4s' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fa500f', animation: 'pulse 1.6s ease-in-out infinite' }} />
              </div>

              <div style={{ fontSize: 28, color: 'rgba(255,250,235,0.12)' }}>{'\u25ce'}</div>
              <div style={{ fontSize: 10, letterSpacing: 2, lineHeight: 2, color: 'rgba(255,250,235,0.22)', textTransform: 'uppercase' }}>
                Ask about any location<br />or enter a query
              </div>
              <div style={{ fontSize: 8, color: 'rgba(255,250,235,0.1)', letterSpacing: 1 }}>
                paris {'\u00b7'} california {'\u00b7'} tokyo {'\u00b7'} odessa
              </div>

              {/* Quick action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, width: '100%', maxWidth: 260 }}>
                {['Analyze Marseille', 'Strait of Gibraltar area', 'Situation in Odessa'].map(q => (
                  <button
                    key={q}
                    onClick={() => { handleSearch(q); setInputVal(''); }}
                    style={{
                      background: 'transparent', border: '1px solid rgba(255,250,235,0.06)',
                      color: 'rgba(255,250,235,0.25)', fontFamily: mono, fontSize: 9,
                      letterSpacing: 2, padding: '8px 12px', cursor: 'pointer',
                      textTransform: 'uppercase', textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(250,80,15,0.3)'; e.currentTarget.style.color = '#fa500f'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,250,235,0.06)'; e.currentTarget.style.color = 'rgba(255,250,235,0.25)'; }}
                  >
                    {'\u2192'} {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading chips */}
          {showLoadingChips && (
            <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tools.map(chip => (
                <div key={chip.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 9, letterSpacing: 2, color: chip.status === 'done' ? 'rgba(255,250,235,0.25)' : 'rgba(255,250,235,0.45)', textTransform: 'uppercase' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fa500f', animation: chip.status === 'running' ? 'pulse 0.6s ease-in-out infinite' : 'none', opacity: chip.status === 'done' ? 0.2 : 1, flexShrink: 0 }} />
                  {TOOL_LABELS[chip.name] ?? chip.name}
                </div>
              ))}
            </div>
          )}

          {/* Intel header */}
          {hasResults && (
            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,250,235,0.08)', flexShrink: 0 }}>
              <div style={{ fontSize: 8, letterSpacing: 4, color: 'rgba(255,250,235,0.45)', textTransform: 'uppercase', marginBottom: 5 }}>Intelligence Brief</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fa500f', letterSpacing: 1 }}>
                {location?.name.toUpperCase() ?? '\u2014'}
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,250,235,0.45)', marginTop: 2 }}>
                {location ? `${location.lat.toFixed(2)}\u00b0N  ${location.lng.toFixed(2)}\u00b0E` : '\u2014'}
              </div>
            </div>
          )}

          {/* Mini map — shown as soon as geocode returns */}
          {location && (
            <div style={{ position: 'relative', height: 175, flexShrink: 0, overflow: 'hidden', borderBottom: '1px solid rgba(255,250,235,0.08)' }}>
              <iframe
                key={`${location.lat},${location.lng}`}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.35},${location.lat - 0.22},${location.lng + 0.35},${location.lat + 0.22}&layer=mapnik&marker=${location.lat},${location.lng}`}
                style={{ width: '100%', height: 220, border: 'none', marginTop: -22, filter: 'invert(1) hue-rotate(180deg) brightness(0.8) saturate(0.9)', display: 'block' }}
                title="Location map"
                sandbox="allow-scripts allow-same-origin"
              />
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(to right, rgba(250,80,15,0.5), transparent)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: 7, left: 10, fontSize: 7, letterSpacing: 2, color: 'rgba(250,80,15,0.75)', textTransform: 'uppercase', pointerEvents: 'none', fontFamily: mono }}>
                {location.lat.toFixed(4)}{'\u00b0'}N {'\u00b7'} {location.lng.toFixed(4)}{'\u00b0'}E
              </div>
              <div style={{ position: 'absolute', top: 7, left: 7, width: 10, height: 10, borderTop: '1px solid rgba(250,80,15,0.5)', borderLeft: '1px solid rgba(250,80,15,0.5)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: 7, right: 7, width: 10, height: 10, borderTop: '1px solid rgba(250,80,15,0.5)', borderRight: '1px solid rgba(250,80,15,0.5)', pointerEvents: 'none' }} />
            </div>
          )}

          {/* Events scroll */}
          {hasResults && (
            <div id="events-scroll" style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
              <EarthPanel panelData={panelData} location={location} />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,80,0,0.2)', fontSize: 10, color: '#ff4500', lineHeight: 1.6, flexShrink: 0, fontFamily: mono }}>
              {'\u26a0'} {error}
            </div>
          )}

          {/* Footer sources */}
          {hasResults && (
            <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(255,250,235,0.08)', fontSize: 7, color: 'rgba(255,250,235,0.12)', letterSpacing: 2, flexShrink: 0 }}>
              OPEN-METEO {'\u00b7'} NASA EONET {'\u00b7'} USGS {'\u00b7'} GDELT {'\u00b7'} ACLED
            </div>
          )}
        </div>

        <SearchBar
          inputRef={inpRef}
          value={inputVal}
          onChange={setInputVal}
          onSubmit={submitTextQuery}
          isLoading={isLoading}
          isScanning={isScanning}
          statusText={statusText}
          monoFont={mono}
        />
      </div>

      <BriefingPanel
        show={showBriefingPanel}
        width={BRIEF_W}
        briefing={briefing}
        agentMode={agentMode}
        monoFont={mono}
        onClose={() => setBriefingVisible(false)}
      />

      {/* Watermark */}
      <div style={{ position: 'fixed', bottom: 10, right: 18, fontSize: 7, letterSpacing: 3, color: 'rgba(255,250,235,0.06)', textTransform: 'uppercase', pointerEvents: 'none', zIndex: 70, fontFamily: mono }}>
        OmniCAT {'\u00b7'} 2026
      </div>
    </>
  );
}
