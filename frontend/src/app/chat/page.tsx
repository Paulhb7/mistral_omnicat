'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useChat } from '@/hooks/use-chat';
import { useTheme } from '@/context/theme-context';
import { BriefingPanel } from '@/components/briefing-panel';
import { JarvisLoader } from '@/components/jarvis-loader';
import { NasaCallPopup } from '@/components/nasa-call-popup';
import { VaderCallPopup } from '@/components/vader-call-popup';
import { sfxActivate, sfxDeactivate, sfxListening, sfxSubmit, sfxSpeakStart, sfxComplete, sfxIncomingCall, sfxBargeIn } from '@/utils/sfx';

const OmniOrb = dynamic(() => import('@/components/omni-orb').then(m => ({ default: m.OmniOrb })), { ssr: false });
const EarthMap = dynamic(() => import('@/components/earth-map'), { ssr: false });

// ── Constants ────────────────────────────────────────────────────────────────

const BRIEF_W = 380;

// NASA Eyes — hide UI chrome via query params
const UI_Q =
  '?featured=false&detailPanel=false&logo=false&search=false' +
  '&shareButton=false&menu=false&collapseSettingsOptions=true&hideFullScreenToggle=true';
const SOLAR_URL = 'https://eyes.nasa.gov/apps/solar-system/';
const SOLAR_DEFAULT = `${SOLAR_URL}#/earth${UI_Q}`;

const EXO_URL = 'https://eyes.nasa.gov/apps/exo/';
const EXO_DEFAULT = `${EXO_URL}#/?embed=true`;

const ASTEROIDS_URL = 'https://eyes.nasa.gov/apps/asteroids/';
const ASTEROIDS_DEFAULT = `${ASTEROIDS_URL}#/home`;

type MapView = 'earth' | 'solar' | 'exo' | 'asteroids' | null;

// ── Celestial body detection ─────────────────────────────────────────────────

const CELESTIAL: [string, string][] = [
  ['mercury', 'mercury'], ['venus', 'venus'], ['earth', 'earth'],
  ['mars', 'mars'], ['jupiter', 'jupiter'], ['saturn', 'saturn'],
  ['uranus', 'uranus'], ['neptune', 'neptune'], ['pluto', 'pluto'],
  ['sun', 'sun'],
  ['moon', 'earths_moon'], ['titan', 'titan'], ['europa', 'europa'],
  ['ganymede', 'ganymede'], ['callisto', 'callisto'], ['io', 'io'],
  ['enceladus', 'enceladus'], ['triton', 'triton'],
  ['phobos', 'phobos'], ['deimos', 'deimos'], ['charon', 'charon'],
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

const ASTEROID_KW = [
  'asteroid', 'asteroids', 'asteroïde', 'asteroïdes', 'astéroïde', 'astéroïdes',
  'near-earth object', 'near earth object', 'neos', 'neo ',
];

function detectAsteroid(q: string): boolean {
  return ASTEROID_KW.some(kw => q.toLowerCase().includes(kw));
}

const TOOL_LABELS: Record<string, string> = {
  geocode_location:       'GEOCODE',
  get_weather:            'WEATHER',
  get_climate_events:     'CLIMATE',
  get_earthquakes:        'SEISMIC',
  get_news:               'NEWS',
  get_conflict_events:    'CONFLICT',
  search_conflict_intelligence: 'PERPLEXITY',
  maritime_analyst:       'MARITIME',
  aviation_analyst:       'AVIATION',
  doomsday_analyst:       'DOOMSDAY',
  conflict_analyst:       'CONFLICT',
  solar_system_analyst:   'SOLAR',
  milky_way_analyst:      'MILKY WAY',
};

const mono = "'Roboto Mono', monospace";

// ── Main page ────────────────────────────────────────────────────────────────

export default function IntelPage() {
  const [inputVal, setInputVal]     = useState('');
  const [statusText, setStatusText] = useState('READY');
  const [briefingVisible, setBriefingVisible] = useState(false);
  const [mapAgent, setMapAgent] = useState<MapView>(null);
  const [modeText, setModeText] = useState('SOLAR SYSTEM · EARTH');

  // ── Call popups ─────────────────────────────────────────────────────────────
  const [nasaPopupVisible, setNasaPopupVisible] = useState(false);
  const [vaderPopupVisible, setVaderPopupVisible] = useState(false);

  // ── Voice state ──────────────────────────────────────────────────────────────
  const [voiceMode, setVoiceMode]     = useState(false);
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [isListening, setIsListening] = useState(false);
  const analyserRef   = useRef<AnalyserNode | null>(null);
  const audioCtxRef   = useRef<AudioContext | null>(null);
  const sttWsRef      = useRef<WebSocket | null>(null);
  const micStreamRef  = useRef<MediaStream | null>(null);
  const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);
  const transcriptRef = useRef('');
  const voiceModeRef  = useRef(false);
  const ttsAudioRef   = useRef<HTMLAudioElement | null>(null);
  const handleSearchRef = useRef<(q: string) => void>(() => {});

  // ── Barge-in state ────────────────────────────────────────────────────────
  const bargeInStreamRef    = useRef<MediaStream | null>(null);
  const bargeInProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const bargeInCtxRef       = useRef<AudioContext | null>(null);
  const isBargeInMonitoringRef = useRef(false);
  const handleBargeInRef    = useRef<() => void>(() => {});

  const inpRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const exoIframeRef = useRef<HTMLIFrameElement>(null);
  const asteroidsIframeRef = useRef<HTMLIFrameElement>(null);

  const { send, reset, isLoading, briefing, location, tools, panelData, error, agentMode } = useChat();
  const { theme, themeKey, toggle: toggleTheme } = useTheme();
  const isCyber = themeKey === 'cyberpunk';

  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);

  // ── Audio context helpers ─────────────────────────────────────────────────

  const ensureAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    if (!analyserRef.current) {
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
    }
    return { ctx: audioCtxRef.current, analyser: analyserRef.current };
  }, []);

  const stopMicAndWs = useCallback(() => {
    if (scriptNodeRef.current) { scriptNodeRef.current.disconnect(); scriptNodeRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach(t => t.stop()); micStreamRef.current = null; }
    if (sttWsRef.current && sttWsRef.current.readyState <= WebSocket.OPEN) { sttWsRef.current.close(); sttWsRef.current = null; }
  }, []);

  const stopBargeInMonitor = useCallback(() => {
    isBargeInMonitoringRef.current = false;
    if (bargeInProcessorRef.current) { bargeInProcessorRef.current.disconnect(); bargeInProcessorRef.current = null; }
    if (bargeInStreamRef.current) { bargeInStreamRef.current.getTracks().forEach(t => t.stop()); bargeInStreamRef.current = null; }
    if (bargeInCtxRef.current) { bargeInCtxRef.current.close(); bargeInCtxRef.current = null; }
  }, []);

  // ── STT — realtime via Voxtral WebSocket (PCM s16le 16kHz) ──────────────

  const startListening = useCallback(async () => {
    stopMicAndWs();
    stopBargeInMonitor();
    transcriptRef.current = '';

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true } });
    } catch { return; }
    micStreamRef.current = stream;

    setIsListening(true);
    setStatusText('LISTENING . . .');

    const ws = new WebSocket('ws://localhost:8000/ws/stt');
    sttWsRef.current = ws;
    let submitted = false;

    const submitTranscript = () => {
      if (submitted) return;
      const text = transcriptRef.current.trim();
      if (!text) {
        submitted = true;
        stopMicAndWs();
        setIsListening(false);
        if (voiceModeRef.current) setTimeout(() => { if (voiceModeRef.current) startListening(); }, 300);
        return;
      }
      submitted = true;
      sfxSubmit();
      stopMicAndWs();
      setIsListening(false);
      handleSearchRef.current(text);
    };

    ws.onopen = () => {
      setStatusText('LISTENING . . .');
      sfxListening();

      const ctx = new AudioContext({ sampleRate: 16000 });
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      let lastSpeechTime = Date.now();
      let hasSpoken = false;

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const float32 = e.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < float32.length; i++) sum += float32[i] * float32[i];
        const rms = Math.sqrt(sum / float32.length);

        if (rms > 0.015) { lastSpeechTime = Date.now(); hasSpoken = true; }
        else if (hasSpoken && Date.now() - lastSpeechTime > 1500) { submitTranscript(); return; }

        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        ws.send(int16.buffer);
      };

      source.connect(processor);
      processor.connect(ctx.destination);
      scriptNodeRef.current = processor;
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'text_delta') {
        transcriptRef.current += msg.text;
        setStatusText(`HEARD: ${transcriptRef.current.slice(-40)}`);
      } else if (msg.type === 'done') { submitTranscript(); }
      else if (msg.type === 'error') {
        stopMicAndWs(); setIsListening(false); setStatusText('STT ERROR');
        if (voiceModeRef.current) setTimeout(() => { if (voiceModeRef.current) startListening(); }, 1000);
      }
    };

    ws.onerror = () => { stopMicAndWs(); setIsListening(false); setStatusText('STT ERROR'); };
    ws.onclose = () => submitTranscript();
  }, [stopMicAndWs, stopBargeInMonitor]);

  // ── TTS ────────────────────────────────────────────────────────────────────

  const stopTts = useCallback(() => {
    if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current.src = ''; ttsAudioRef.current = null; }
  }, []);

  const handleBargeIn = useCallback(() => {
    stopBargeInMonitor(); stopTts(); setIsSpeaking(false);
    sfxBargeIn(); setStatusText('INTERRUPTED');
    startListening();
  }, [stopBargeInMonitor, stopTts, startListening]);

  useEffect(() => { handleBargeInRef.current = handleBargeIn; }, [handleBargeIn]);

  const startBargeInMonitor = useCallback(async () => {
    if (!voiceModeRef.current) return;
    stopBargeInMonitor();
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true } }); }
    catch { return; }
    bargeInStreamRef.current = stream;
    const biCtx = new AudioContext({ sampleRate: 16000 });
    bargeInCtxRef.current = biCtx;
    const source = biCtx.createMediaStreamSource(stream);
    const processor = biCtx.createScriptProcessor(4096, 1, 1);
    const ttsStartTime = Date.now();
    let consecutiveAboveThreshold = 0;
    isBargeInMonitoringRef.current = true;
    processor.onaudioprocess = (e) => {
      if (!isBargeInMonitoringRef.current) return;
      const float32 = e.inputBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < float32.length; i++) sum += float32[i] * float32[i];
      const rms = Math.sqrt(sum / float32.length);
      if (Date.now() - ttsStartTime < 500) return;
      if (rms > 0.04) { consecutiveAboveThreshold++; if (consecutiveAboveThreshold >= 3) handleBargeInRef.current(); }
      else { consecutiveAboveThreshold = 0; }
    };
    source.connect(processor);
    processor.connect(biCtx.destination);
    bargeInProcessorRef.current = processor;
  }, [stopBargeInMonitor]);

  const speak = useCallback(async (text: string) => {
    if (!voiceModeRef.current || !text) return;
    stopTts(); stopBargeInMonitor();
    const { ctx, analyser } = ensureAudioCtx();
    if (ctx.state === 'suspended') await ctx.resume();
    setIsSpeaking(true); setStatusText('SPEAKING . . .'); sfxSpeakStart();
    try {
      const resp = await fetch('http://localhost:8000/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      if (!resp.ok) throw new Error(`TTS ${resp.status}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      ttsAudioRef.current = audio;
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser); analyser.connect(ctx.destination);
      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); ttsAudioRef.current = null; stopBargeInMonitor(); if (voiceModeRef.current) { setStatusText('LISTENING . . .'); startListening(); } };
      audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(url); ttsAudioRef.current = null; stopBargeInMonitor(); };
      await audio.play(); startBargeInMonitor();
    } catch { setIsSpeaking(false); stopBargeInMonitor(); if (voiceModeRef.current) { setStatusText('LISTENING . . .'); startListening(); } }
  }, [ensureAudioCtx, startListening, stopTts, startBargeInMonitor, stopBargeInMonitor]);

  // ── Toggle voice mode ─────────────────────────────────────────────────────

  const toggleVoice = useCallback(() => {
    if (voiceMode) {
      sfxDeactivate(); setVoiceMode(false); setIsListening(false); setIsSpeaking(false);
      stopTts(); stopMicAndWs(); stopBargeInMonitor(); setStatusText('READY');
    } else {
      sfxActivate(); setVoiceMode(true); ensureAudioCtx(); startListening();
    }
  }, [voiceMode, ensureAudioCtx, startListening, stopMicAndWs, stopTts, stopBargeInMonitor]);

  // ── Call popups ────────────────────────────────────────────────────────────

  const nasaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vaderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activateVoiceIfNeeded = useCallback(() => {
    if (!voiceModeRef.current) { sfxActivate(); setVoiceMode(true); voiceModeRef.current = true; ensureAudioCtx(); }
  }, [ensureAudioCtx]);

  const triggerNasaCall = useCallback(() => {
    if (nasaPopupVisible || nasaTimerRef.current) return;
    activateVoiceIfNeeded(); const { ctx } = ensureAudioCtx(); if (ctx.state === 'suspended') ctx.resume();
    sfxIncomingCall();
    nasaTimerRef.current = setTimeout(() => { nasaTimerRef.current = null; setNasaPopupVisible(true); speak("It seems you have received a message from NASA. Some tricky asteroids have entered the solar system. Do we accept the mission? If we don't, I will reconsider my position."); }, 3500);
  }, [nasaPopupVisible, activateVoiceIfNeeded, ensureAudioCtx, speak]);

  const triggerVaderCall = useCallback(() => {
    if (vaderPopupVisible || vaderTimerRef.current) return;
    activateVoiceIfNeeded(); const { ctx } = ensureAudioCtx(); if (ctx.state === 'suspended') ctx.resume();
    sfxIncomingCall();
    vaderTimerRef.current = setTimeout(() => { vaderTimerRef.current = null; setVaderPopupVisible(true); speak("Well, that's unexpected. Darth Vader himself is requesting exoplanet intelligence. I suppose even the Dark Side needs real estate options. Let me search the Milky Way before he force-chokes our servers."); }, 3500);
  }, [vaderPopupVisible, activateVoiceIfNeeded, ensureAudioCtx, speak]);

  const handleVaderVideoEnd = useCallback(() => {
    if (themeKey !== 'cyberpunk') { toggleTheme(); }
  }, [themeKey, toggleTheme]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        if (e.key.toLowerCase() === 'n') { e.preventDefault(); triggerNasaCall(); }
        if (e.key.toLowerCase() === 'v') { e.preventDefault(); triggerVaderCall(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [triggerNasaCall, triggerVaderCall]);

  // ── Speak briefing when it completes in voice mode ────────────────────────

  const prevBriefingRef = useRef<string | null>(null);
  useEffect(() => {
    if (voiceMode && briefing && !isLoading && briefing !== prevBriefingRef.current) {
      prevBriefingRef.current = briefing;
      sfxComplete();
      const clean = briefing.replace(/[#*_\[\]()>`|\\-]/g, '').replace(/\n+/g, '. ');
      speak(clean);
    }
  }, [voiceMode, briefing, isLoading, speak]);

  // ── Search handler ─────────────────────────────────────────────────────────

  const handleSearch = useCallback(async (q: string) => {
    const text = q.trim();
    if (!text) return;
    setStatusText('ROUTING . . .');
    setBriefingVisible(false);

    const isAsteroid = detectAsteroid(text);
    if (isAsteroid) { setMapAgent('asteroids'); setModeText('ASTEROIDS · NEAR-EARTH OBJECTS'); }

    if (!isAsteroid) {
      const target = detectCelestial(text);
      if (target) {
        setMapAgent('solar'); setModeText(`SOLAR SYSTEM · ${target.label}`);
        const url = `${SOLAR_URL}#/${target.id}${UI_Q}`;
        try { iframeRef.current?.contentWindow?.location.replace(url); } catch { if (iframeRef.current) iframeRef.current.src = url; }
      }
    }

    await send(text);
  }, [send]);

  useEffect(() => { handleSearchRef.current = handleSearch; }, [handleSearch]);

  const submitTextQuery = useCallback(() => { handleSearch(inputVal); setInputVal(''); }, [handleSearch, inputVal]);

  // ── Sync mapAgent ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (agentMode === 'milky_way') { setMapAgent(prev => prev === 'exo' ? prev : 'exo'); setModeText(prev => prev.startsWith('MILKY WAY') ? prev : 'MILKY WAY · EXOPLANETS'); }
    else if (agentMode === 'solar_system') { setMapAgent(prev => (prev === 'solar' || prev === 'asteroids') ? prev : 'solar'); }
    else if (agentMode !== null) { setMapAgent('earth'); }
  }, [agentMode]);

  useEffect(() => {
    if (location && agentMode !== 'solar_system' && agentMode !== 'milky_way') {
      setMapAgent('earth'); setModeText(`EARTH · ${location.name.toUpperCase()}`);
    }
  }, [location, agentMode]);

  // ── Sync status ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (isLoading) {
      if (agentMode) setStatusText(`${agentMode.toUpperCase()} AGENT`);
      else setStatusText('ROUTING . . .');
    } else if (location) {
      const ev = (panelData.climate as { total?: number } | undefined)?.total ?? 0;
      const qk = (panelData.earthquakes as { total?: number } | undefined)?.total ?? 0;
      const nw = (panelData.news as { total?: number } | undefined)?.total ?? 0;
      setStatusText(`${ev} EVENTS · ${qk} QUAKES · ${nw} NEWS`);
    } else if (!isLoading) {
      if (tools.length > 0) setStatusText('COMPLETE');
      else if (!voiceMode) setStatusText('READY');
      else if (!isListening && !isSpeaking) setStatusText('READY');
    }
  }, [isLoading, location, panelData, agentMode, tools.length, voiceMode, isListening, isSpeaking]);

  useEffect(() => { if (briefing) setBriefingVisible(true); }, [briefing]);

  const showBriefingPanel = !!briefing && briefingVisible;

  return (
    <>
      {/* ── Full-screen background: map or NASA Eyes ──────────────────── */}
      {mapAgent === 'earth' ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
          <EarthMap
            center={location}
            climateEvents={(panelData.climate as { events?: Array<{ id: string; title: string; category: string; category_id: string; date: string | null; lat: number | null; lng: number | null }> } | undefined)?.events}
            earthquakes={(panelData.earthquakes as { earthquakes?: Array<{ magnitude: number; place: string; lat: number; lng: number; depth_km: number; date: string }> } | undefined)?.earthquakes}
            conflicts={(panelData.conflict as { recent_events?: Array<{ date: string; type: string; location: string; fatalities: number; lat: number | null; lng: number | null }> } | undefined)?.recent_events}
          />
        </div>
      ) : mapAgent === 'exo' ? (
        <iframe ref={exoIframeRef} src={EXO_DEFAULT} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', border: 'none', zIndex: 0 }} allow="fullscreen" allowFullScreen title="NASA Eyes on Exoplanets" />
      ) : mapAgent === 'asteroids' ? (
        <iframe ref={asteroidsIframeRef} src={ASTEROIDS_DEFAULT} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', border: 'none', zIndex: 0 }} allow="fullscreen" allowFullScreen title="NASA Eyes on Asteroids" />
      ) : (
        <iframe ref={iframeRef} src={SOLAR_DEFAULT} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', border: 'none', zIndex: 0 }} allow="fullscreen" allowFullScreen title="NASA Eyes" />
      )}

      {/* ── HUD corners ──────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', top: 64, left: 16, width: 14, height: 14, borderTop: `1px solid ${theme.fgMuted}`, borderLeft: `1px solid ${theme.fgMuted}`, pointerEvents: 'none', zIndex: 75 }} />
      <div style={{ position: 'fixed', top: 64, right: 16, width: 14, height: 14, borderTop: `1px solid ${theme.fgMuted}`, borderRight: `1px solid ${theme.fgMuted}`, pointerEvents: 'none', zIndex: 75 }} />
      <div style={{ position: 'fixed', bottom: 16, left: 16, width: 14, height: 14, borderBottom: `1px solid ${theme.fgMuted}`, borderLeft: `1px solid ${theme.fgMuted}`, pointerEvents: 'none', zIndex: 75 }} />
      <div style={{ position: 'fixed', bottom: 16, right: 16, width: 14, height: 14, borderBottom: `1px solid ${theme.fgMuted}`, borderRight: `1px solid ${theme.fgMuted}`, pointerEvents: 'none', zIndex: 75 }} />

      {/* ── Navbar ───────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', background: `${theme.bg}cc`, backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${theme.border}`, zIndex: 80, fontFamily: mono,
      }}>
        <Link href="/" style={{ fontSize: isCyber ? 15 : 12, fontWeight: 700, letterSpacing: isCyber ? 6 : 4, color: theme.accent, textDecoration: 'none' }}>
          Omni<strong>CAT</strong>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 9, letterSpacing: 3, color: theme.fgDim, textTransform: 'uppercase' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: theme.accent, animation: 'pulse 1.6s ease-in-out infinite', flexShrink: 0 }} />
          {modeText}
          {agentMode && (
            <span style={{ fontSize: 7, letterSpacing: 2, padding: '2px 7px', border: `1px solid ${theme.accentBorder}`, color: theme.accent, textTransform: 'uppercase' }}>
              {agentMode.toUpperCase()} AGENT
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={toggleTheme} title="Toggle Cyberpunk mode (Ctrl+Shift+X)" style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.fgDim, fontFamily: mono, fontSize: 8, letterSpacing: 2, padding: '4px 10px', cursor: 'pointer', textTransform: 'uppercase' }}>
            {isCyber ? '\u25c8 CYBER' : '\u25cb CYBER'}
          </button>
          <Link href="/about" style={{ fontSize: 11, letterSpacing: 2, color: theme.fgDim, textDecoration: 'none', textTransform: 'uppercase' }}>About</Link>
          <button onClick={() => { reset(); setBriefingVisible(false); setStatusText('READY'); setMapAgent(null); setModeText('SOLAR SYSTEM · EARTH'); try { iframeRef.current?.contentWindow?.location.replace(SOLAR_DEFAULT); } catch { if (iframeRef.current) iframeRef.current.src = SOLAR_DEFAULT; } }} style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.fgDim, fontFamily: mono, fontSize: 8, letterSpacing: 2, padding: '4px 10px', cursor: 'pointer', textTransform: 'uppercase' }}>
            RESET
          </button>
        </div>
      </nav>

      {/* ── Center: Omni Orb + JarvisLoader overlay ──────────────────── */}
      <div style={{
        position: 'fixed',
        top: '50%', left: showBriefingPanel ? `calc(50% - ${BRIEF_W / 2}px)` : '50%',
        transform: 'translate(-50%, -55%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        zIndex: 60, pointerEvents: 'none',
        transition: 'left 0.4s ease',
      }}>
        {/* JarvisLoader — wraps behind the orb */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <JarvisLoader active={isLoading} agentLabel={agentMode ? `${agentMode.toUpperCase()} AGENT` : 'SCANNING'} />
        </div>

        {/* Orb */}
        <OmniOrb isSpeaking={isSpeaking} analyser={analyserRef.current} />

        {/* Status text */}
        <div style={{
          fontSize: 8, letterSpacing: 4, color: isSpeaking ? theme.accent : theme.fgDim,
          textTransform: 'uppercase', fontFamily: mono, marginTop: 4,
          animation: (isSpeaking || isListening || isLoading) ? 'pulse 1.2s ease-in-out infinite' : 'none',
          textShadow: `0 0 12px ${theme.bg}`,
        }}>
          {statusText}
        </div>

        {/* Loading tool chips — floating below orb */}
        {isLoading && tools.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 360 }}>
            {tools.map(chip => (
              <span key={chip.name} style={{
                fontSize: 8, letterSpacing: 2, padding: '3px 8px',
                background: `${theme.bg}aa`, border: `1px solid ${theme.accentBorder}`,
                color: chip.status === 'done' ? theme.fgMuted : theme.accent,
                fontFamily: mono, textTransform: 'uppercase',
                opacity: chip.status === 'done' ? 0.5 : 1,
              }}>
                {chip.status === 'running' ? '\u25cf ' : '\u2713 '}
                {TOOL_LABELS[chip.name] ?? chip.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom center: Search bar + Mic ─────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 40,
        left: showBriefingPanel ? `calc(50% - ${BRIEF_W / 2}px)` : '50%',
        transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 10,
        zIndex: 70,
        transition: 'left 0.4s ease',
      }}>
        {/* Mic button */}
        <button
          onClick={toggleVoice}
          style={{
            width: 46, height: 46, borderRadius: '50%',
            background: voiceMode ? theme.accent : `${theme.bg}cc`,
            border: `2px solid ${voiceMode ? theme.accent : theme.fgMuted}`,
            color: voiceMode ? theme.bg : theme.fgMuted,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            boxShadow: voiceMode ? `0 0 20px ${theme.accent}60` : 'none',
            transition: 'all 0.3s ease', flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>

        {/* Text input */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: `${theme.bg}cc`, backdropFilter: 'blur(12px)',
          border: `1px solid ${theme.border}`, padding: '0 4px 0 16px',
          width: 360, height: 46,
        }}>
          <input
            ref={inpRef}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitTextQuery(); }}
            placeholder={voiceMode ? 'Listening...' : 'Ask anything...'}
            disabled={isLoading}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: theme.fg, fontFamily: mono, fontSize: 12, letterSpacing: 1,
            }}
          />
          <button
            onClick={submitTextQuery}
            disabled={isLoading || !inputVal.trim()}
            style={{
              width: 36, height: 36, background: 'transparent',
              border: `1px solid ${theme.border}`, color: theme.fgDim,
              fontFamily: mono, fontSize: 14, cursor: 'pointer',
              opacity: inputVal.trim() ? 1 : 0.3,
            }}
          >
            {'\u2192'}
          </button>
        </div>
      </div>

      {/* ── Error toast ──────────────────────────────────────────────── */}
      {error && (
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          padding: '8px 20px', background: `${theme.bg}ee`, border: '1px solid rgba(255,80,0,0.3)',
          fontSize: 11, color: '#ff4500', fontFamily: mono, zIndex: 75, backdropFilter: 'blur(8px)',
        }}>
          {'\u26a0'} {error}
        </div>
      )}

      {/* ── Briefing panel ───────────────────────────────────────────── */}
      <BriefingPanel show={showBriefingPanel} width={BRIEF_W} briefing={briefing} agentMode={agentMode} monoFont={mono} onClose={() => setBriefingVisible(false)} />

      {/* ── Call popups ──────────────────────────────────────────────── */}
      <NasaCallPopup visible={nasaPopupVisible} onAccept={() => setNasaPopupVisible(false)} onDismiss={() => setNasaPopupVisible(false)} />
      <VaderCallPopup visible={vaderPopupVisible} onDismiss={() => setVaderPopupVisible(false)} onVideoEnd={handleVaderVideoEnd} />

      {/* ── Hidden call trigger ──────────────────────────────────────── */}
      <button onClick={triggerNasaCall} style={{ position: 'fixed', bottom: 8, right: 90, background: 'transparent', border: 'none', padding: 6, color: theme.fgMuted, cursor: 'pointer', opacity: 0.15, zIndex: 71 }} onMouseEnter={e => { e.currentTarget.style.opacity = '0.5'; }} onMouseLeave={e => { e.currentTarget.style.opacity = '0.15'; }} title="Incoming call">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
        </svg>
      </button>

      {/* Watermark */}
      <div style={{ position: 'fixed', bottom: 10, right: 18, fontSize: 7, letterSpacing: 3, color: theme.fgMuted, textTransform: 'uppercase', pointerEvents: 'none', zIndex: 70, fontFamily: mono }}>
        OmniCAT {'\u00b7'} 2026
      </div>
    </>
  );
}
