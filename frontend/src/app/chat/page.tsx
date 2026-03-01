'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useChat } from '@/hooks/use-chat';
import { useTheme } from '@/context/theme-context';
import { EarthPanel } from '@/components/intel-panels';
import { SearchBar } from '@/components/search-bar';
import { BriefingPanel } from '@/components/briefing-panel';
import { VoiceOrbStatus } from '@/components/voice-orb-status';
import { MicWaveform } from '@/components/mic-waveform';
import { JarvisLoader } from '@/components/jarvis-loader';
import { NasaCallPopup } from '@/components/nasa-call-popup';
import { VaderCallPopup } from '@/components/vader-call-popup';
import { sfxActivate, sfxDeactivate, sfxListening, sfxSubmit, sfxSpeakStart, sfxComplete, sfxIncomingCall, sfxBargeIn, sfxTypingStart, sfxTypingStop } from '@/utils/sfx';

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

// NASA Eyes on Exoplanets
const EXO_URL = 'https://eyes.nasa.gov/apps/exo/';
const EXO_DEFAULT = `${EXO_URL}#/?embed=true`;

// NASA Eyes on Asteroids
const ASTEROIDS_URL = 'https://eyes.nasa.gov/apps/asteroids/';
const ASTEROIDS_DEFAULT = `${ASTEROIDS_URL}#/home`;

type MapView = 'earth' | 'solar' | 'exo' | 'asteroids' | null;

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

// ── Asteroid / NEO keyword detection ────────────────────────────────────────

const ASTEROID_KW = [
  'asteroid', 'asteroids', 'asteroïde', 'asteroïdes', 'astéroïde', 'astéroïdes',
  'near-earth object', 'near earth object', 'neos', 'neo ',
];

function detectAsteroid(q: string): boolean {
  const low = q.toLowerCase();
  return ASTEROID_KW.some(kw => low.includes(kw));
}

// ── Milky Way / Exoplanet keyword detection ─────────────────────────────────

const MILKY_WAY_KW = [
  'milky-way', 'milky way', 'milkyway',
  'voie lactée', 'voie lactee',
  'exoplanet', 'exoplanets', 'exoplanète', 'exoplanètes',
  'trappist', 'kepler', 'proxima centauri', 'toi-700', 'k2-18',
  'wasp-39', '55 cancri', 'hd 209458',
];

function detectMilkyWay(q: string): boolean {
  const low = q.toLowerCase();
  return MILKY_WAY_KW.some(kw => low.includes(kw));
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
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
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

  // Keep voiceModeRef in sync
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

  // ── Helper: stop mic + WebSocket cleanly ─────────────────────────────────

  const stopMicAndWs = useCallback(() => {
    if (scriptNodeRef.current) { scriptNodeRef.current.disconnect(); scriptNodeRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach(t => t.stop()); micStreamRef.current = null; }
    if (sttWsRef.current && sttWsRef.current.readyState <= WebSocket.OPEN) {
      sttWsRef.current.close();
      sttWsRef.current = null;
    }
    micAnalyserRef.current = null;
  }, []);

  // ── Helper: stop barge-in monitor cleanly ───────────────────────────────

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
    } catch {
      console.error('Microphone access denied');
      return;
    }
    micStreamRef.current = stream;

    // Connect mic to a separate analyser for waveform visualization (with gain boost)
    const { ctx: mainCtx } = ensureAudioCtx();
    const micAnalyser = mainCtx.createAnalyser();
    micAnalyser.fftSize = 256;
    const micGain = mainCtx.createGain();
    micGain.gain.value = 1.5;
    const micVizSource = mainCtx.createMediaStreamSource(stream);
    micVizSource.connect(micGain);
    micGain.connect(micAnalyser);
    micAnalyserRef.current = micAnalyser;

    setIsListening(true);
    setStatusText('CONNECTING . . .');

    // WebSocket to backend
    const ws = new WebSocket('ws://localhost:8000/ws/stt');
    sttWsRef.current = ws;
    let submitted = false;

    const submitTranscript = () => {
      if (submitted) return;
      const text = transcriptRef.current.trim();
      if (!text) {
        // No speech detected — clean up and restart listening if in voice mode
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

      // Capture raw PCM at 16kHz
      const ctx = new AudioContext({ sampleRate: 16000 });
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);

      // Silence detection: track when we last received speech
      let lastSpeechTime = Date.now();
      let hasSpoken = false;
      const SILENCE_TIMEOUT = 1500; // ms of silence before auto-submit

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const float32 = e.inputBuffer.getChannelData(0);

        // Compute RMS energy
        let sum = 0;
        for (let i = 0; i < float32.length; i++) sum += float32[i] * float32[i];
        const rms = Math.sqrt(sum / float32.length);

        if (rms > 0.015) {
          lastSpeechTime = Date.now();
          hasSpoken = true;
        } else if (hasSpoken && Date.now() - lastSpeechTime > SILENCE_TIMEOUT) {
          // Silence detected after speech → submit
          submitTranscript();
          return;
        }

        // Convert float32 → int16 PCM
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
      } else if (msg.type === 'done') {
        submitTranscript();
      } else if (msg.type === 'error') {
        console.error('WS STT error:', msg.text);
        stopMicAndWs();
        setIsListening(false);
        setStatusText('STT ERROR');
        if (voiceModeRef.current) setTimeout(() => { if (voiceModeRef.current) startListening(); }, 1000);
      }
    };

    ws.onerror = () => {
      stopMicAndWs();
      setIsListening(false);
      setStatusText('STT ERROR');
      if (voiceModeRef.current) setTimeout(() => { if (voiceModeRef.current) startListening(); }, 1000);
    };

    ws.onclose = () => submitTranscript();
  }, [stopMicAndWs, stopBargeInMonitor]);

  // ── TTS — speak text aloud via ElevenLabs ────────────────────────────────

  const stopTts = useCallback(() => {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.src = '';
      ttsAudioRef.current = null;
    }
  }, []);

  // ── Barge-in: handle user interruption during TTS ─────────────────────

  const handleBargeIn = useCallback(() => {
    stopBargeInMonitor();
    stopTts();
    setIsSpeaking(false);
    sfxBargeIn();
    setStatusText('INTERRUPTED · LISTENING . . .');
    startListening();
  }, [stopBargeInMonitor, stopTts, startListening]);

  useEffect(() => { handleBargeInRef.current = handleBargeIn; }, [handleBargeIn]);

  // ── Barge-in monitor: mic open during TTS, detect user speech ─────────

  const startBargeInMonitor = useCallback(async () => {
    if (!voiceModeRef.current) return;
    stopBargeInMonitor();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true } });
    } catch {
      return;
    }
    bargeInStreamRef.current = stream;

    const biCtx = new AudioContext({ sampleRate: 16000 });
    bargeInCtxRef.current = biCtx;
    const source = biCtx.createMediaStreamSource(stream);
    const processor = biCtx.createScriptProcessor(4096, 1, 1);

    const BARGE_IN_RMS_THRESHOLD = 0.04;
    const BARGE_IN_CONSECUTIVE_FRAMES = 3;
    const BARGE_IN_COOLDOWN_MS = 500;
    const ttsStartTime = Date.now();
    let consecutiveAboveThreshold = 0;

    isBargeInMonitoringRef.current = true;

    processor.onaudioprocess = (e) => {
      if (!isBargeInMonitoringRef.current) return;

      const float32 = e.inputBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < float32.length; i++) sum += float32[i] * float32[i];
      const rms = Math.sqrt(sum / float32.length);

      if (Date.now() - ttsStartTime < BARGE_IN_COOLDOWN_MS) return;

      if (rms > BARGE_IN_RMS_THRESHOLD) {
        consecutiveAboveThreshold++;
        if (consecutiveAboveThreshold >= BARGE_IN_CONSECUTIVE_FRAMES) {
          handleBargeInRef.current();
        }
      } else {
        consecutiveAboveThreshold = 0;
      }
    };

    source.connect(processor);
    processor.connect(biCtx.destination);
    bargeInProcessorRef.current = processor;
  }, [stopBargeInMonitor]);

  const speak = useCallback(async (text: string) => {
    if (!voiceModeRef.current || !text) return;
    stopTts();
    stopBargeInMonitor();

    const { ctx, analyser } = ensureAudioCtx();
    if (ctx.state === 'suspended') await ctx.resume();

    setIsSpeaking(true);
    setStatusText('AGENT SPEAKING . . .');
    sfxSpeakStart();

    try {
      const resp = await fetch('http://localhost:8000/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!resp.ok) throw new Error(`TTS ${resp.status}`);

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      ttsAudioRef.current = audio;

      // Connect to analyser so the orb reacts to the actual voice
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        ttsAudioRef.current = null;
        stopBargeInMonitor();
        if (voiceModeRef.current) {
          setStatusText('LISTENING . . .');
          startListening();
        }
      };

      audio.onerror = () => {
        console.error('TTS playback error');
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        ttsAudioRef.current = null;
        stopBargeInMonitor();
      };

      await audio.play();
      startBargeInMonitor();
    } catch (err) {
      console.error('TTS error:', err);
      setIsSpeaking(false);
      stopBargeInMonitor();
      if (voiceModeRef.current) {
        setStatusText('LISTENING . . .');
        startListening();
      }
    }
  }, [ensureAudioCtx, startListening, stopTts, startBargeInMonitor, stopBargeInMonitor]);

  // ── Toggle voice mode ─────────────────────────────────────────────────────

  const toggleVoice = useCallback(() => {
    if (voiceMode) {
      sfxDeactivate();
      setVoiceMode(false);
      setIsListening(false);
      setIsSpeaking(false);
      stopTts();
      stopMicAndWs();
      stopBargeInMonitor();
      setStatusText('READY');
    } else {
      sfxActivate();
      setVoiceMode(true);
      ensureAudioCtx();
      startListening();
    }
  }, [voiceMode, ensureAudioCtx, startListening, stopMicAndWs, stopTts, stopBargeInMonitor]);

  // ── Call popup helpers (shared logic) ────────────────────────────────────

  const nasaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vaderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cyberTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activateVoiceIfNeeded = useCallback(() => {
    if (!voiceModeRef.current) {
      sfxActivate();
      setVoiceMode(true);
      voiceModeRef.current = true;
      ensureAudioCtx();
    }
  }, [ensureAudioCtx]);

  // ── NASA call popup trigger ──────────────────────────────────────────────

  const triggerNasaCall = useCallback(() => {
    if (nasaPopupVisible || nasaTimerRef.current) return;
    // Activate voice + AudioContext NOW (in user gesture) so it's not suspended later
    activateVoiceIfNeeded();
    const { ctx } = ensureAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    sfxIncomingCall();
    // 3.5s suspense, then popup + Omni speaks
    nasaTimerRef.current = setTimeout(() => {
      nasaTimerRef.current = null;
      setNasaPopupVisible(true);
      speak(
        "It seems you have received a message from NASA. Some tricky asteroids have entered the solar system. Do we accept the mission? If we don't, I will reconsider my position."
      );
    }, 3500);
  }, [nasaPopupVisible, activateVoiceIfNeeded, ensureAudioCtx, speak]);

  const handleNasaAccept = useCallback(() => {
    setNasaPopupVisible(false);
  }, []);

  const handleNasaDismiss = useCallback(() => {
    setNasaPopupVisible(false);
  }, []);

  // ── Vader call popup trigger ─────────────────────────────────────────────

  const triggerVaderCall = useCallback(() => {
    if (vaderPopupVisible || vaderTimerRef.current) return;
    activateVoiceIfNeeded();
    const { ctx } = ensureAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    sfxIncomingCall();
    vaderTimerRef.current = setTimeout(() => {
      vaderTimerRef.current = null;
      setVaderPopupVisible(true);
      speak("Looks like a call from very far away. Let me see what's going on.");
    }, 3500);
  }, [vaderPopupVisible, activateVoiceIfNeeded, ensureAudioCtx, speak]);

  const handleVaderVideoEnd = useCallback(() => {
    if (cyberTimerRef.current) clearTimeout(cyberTimerRef.current);
    if (themeKey !== 'cyberpunk') {
      cyberTimerRef.current = setTimeout(() => {
        cyberTimerRef.current = null;
        toggleTheme();
      }, 10_000);
    }
  }, [themeKey, toggleTheme]);

  const handleVaderDismiss = useCallback(() => {
    setVaderPopupVisible(false);
  }, []);

  // Keyboard shortcuts: Cmd+Shift+N → NASA, Cmd+Shift+V → Vader
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

    setIsScanning(true);
    setStatusText('ROUTING . . .');
    setBriefingVisible(false);

    // Detect milky-way / exoplanet → switch to Eyes on Exoplanets
    const isMilkyWay = detectMilkyWay(text);
    if (isMilkyWay) {
      setMapAgent('exo');
      setModeText('MILKY WAY · EXOPLANETS');
    }

    // Detect asteroid / NEO → switch to Eyes on Asteroids
    const isAsteroid = !isMilkyWay && detectAsteroid(text);
    if (isAsteroid) {
      setMapAgent('asteroids');
      setModeText('ASTEROIDS · NEAR-EARTH OBJECTS');
    }

    // Detect celestial body — fly directly to planet, moon, or spacecraft
    if (!isMilkyWay && !isAsteroid) {
      const target = detectCelestial(text);
      if (target) {
        setMapAgent('solar');
        setModeText(`SOLAR SYSTEM · ${target.label}`);
        const url = `${SOLAR_URL}#/${target.id}${UI_Q}`;
        try { iframeRef.current?.contentWindow?.location.replace(url); }
        catch { if (iframeRef.current) iframeRef.current.src = url; }
      }
    }

    await send(text);
  }, [send]);

  // Keep handleSearchRef in sync for voice callbacks
  useEffect(() => { handleSearchRef.current = handleSearch; }, [handleSearch]);

  const submitTextQuery = useCallback(() => {
    handleSearch(inputVal);
    setInputVal('');
  }, [handleSearch, inputVal]);

  // ── Sync mapAgent — only when a real agent is selected (never on reset) ───

  useEffect(() => {
    if (agentMode === 'milky_way') {
      setMapAgent(prev => prev === 'exo' ? prev : 'exo');
      setModeText(prev => prev.startsWith('MILKY WAY') ? prev : 'MILKY WAY · EXOPLANETS');
    } else if (agentMode === 'solar_system') {
      setMapAgent(prev => (prev === 'solar' || prev === 'asteroids') ? prev : 'solar');
    } else if (agentMode !== null) {
      setMapAgent('earth');
    }
  }, [agentMode]);

  // ── Switch to Earth map + update mode text as soon as location arrives ────
  // But DON'T override Solar view (for solar_system / milky_way queries)

  useEffect(() => {
    if (location && agentMode !== 'solar_system' && agentMode !== 'milky_way') {
      setMapAgent('earth');
      setModeText(`EARTH · ${location.name.toUpperCase()}`);
    }
  }, [location, agentMode]);

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

  // ── Typing SFX while agent works ────────────────────────────────────────────

  useEffect(() => {
    if (isLoading) sfxTypingStart();
    else sfxTypingStop();
    return () => sfxTypingStop();
  }, [isLoading]);

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
      {/* Background visualisation — Earth map, NASA Eyes Solar System, or Eyes on Exoplanets */}
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
      ) : mapAgent === 'exo' ? (
        <iframe
          ref={exoIframeRef}
          src={EXO_DEFAULT}
          style={{
            position: 'fixed', top: 56, left: SIDEBAR_W,
            width: showBriefingPanel ? `calc(100vw - ${SIDEBAR_W + BRIEF_W}px)` : `calc(100vw - ${SIDEBAR_W}px)`,
            height: 'calc(100vh - 56px)', border: 'none', zIndex: 0,
            display: 'block', transition: 'width 0.4s ease',
          }}
          allow="fullscreen"
          allowFullScreen
          title="NASA Eyes on Exoplanets"
        />
      ) : mapAgent === 'asteroids' ? (
        <iframe
          ref={asteroidsIframeRef}
          src={ASTEROIDS_DEFAULT}
          style={{
            position: 'fixed', top: 56, left: SIDEBAR_W,
            width: showBriefingPanel ? `calc(100vw - ${SIDEBAR_W + BRIEF_W}px)` : `calc(100vw - ${SIDEBAR_W}px)`,
            height: 'calc(100vh - 56px)', border: 'none', zIndex: 0,
            display: 'block', transition: 'width 0.4s ease',
          }}
          allow="fullscreen"
          allowFullScreen
          title="NASA Eyes on Asteroids"
        />
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
      <div style={{ position: 'fixed', top: 64, right: 16, width: 14, height: 14, borderTop: `1px solid ${theme.fgMuted}`, borderRight: `1px solid ${theme.fgMuted}`, pointerEvents: 'none', zIndex: 75 }} />
      <div style={{ position: 'fixed', bottom: 16, right: 16, width: 14, height: 14, borderBottom: `1px solid ${theme.fgMuted}`, borderRight: `1px solid ${theme.fgMuted}`, pointerEvents: 'none', zIndex: 75 }} />

      {/* Navbar */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: theme.bg, borderBottom: `1px solid ${theme.border}`, zIndex: 80, fontFamily: mono, transition: 'background 0.5s ease, border-color 0.5s ease' }}>
        <Link href="/" style={{ fontSize: isCyber ? 15 : 12, fontWeight: 700, letterSpacing: isCyber ? 6 : 4, color: theme.accent, textDecoration: 'none', animation: isCyber ? 'neon-flicker 4s ease-in-out infinite' : 'none', textShadow: isCyber ? `0 0 10px ${theme.accent}, 0 0 20px ${theme.accent}, 0 0 40px ${theme.accent}` : 'none' }}>
          Omni<strong>CAT</strong>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: isCyber ? 11 : 9, letterSpacing: isCyber ? 4 : 3, color: isCyber ? theme.fg : theme.fgDim, textTransform: 'uppercase', textShadow: isCyber ? `0 0 8px ${theme.accent}` : 'none' }}>
          <div style={{ width: isCyber ? 7 : 5, height: isCyber ? 7 : 5, borderRadius: '50%', background: theme.accent, animation: 'pulse 1.6s ease-in-out infinite', flexShrink: 0, boxShadow: isCyber ? `0 0 8px ${theme.accent}, 0 0 16px ${theme.accent}` : 'none' }} />
          {modeText}
          {agentMode && (
            <span style={{
              fontSize: isCyber ? 9 : 7, letterSpacing: isCyber ? 3 : 2, padding: '2px 7px',
              border: `1px solid ${theme.accentBorder}`,
              color: theme.accent,
              textTransform: 'uppercase',
              textShadow: isCyber ? `0 0 6px ${theme.accent}, 0 0 12px ${theme.accent}` : 'none',
              boxShadow: isCyber ? `0 0 8px ${theme.accentDim}, inset 0 0 6px ${theme.accentDim}` : 'none',
            }}>
              {agentMode.toUpperCase()} AGENT
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Theme toggle button */}
          <button
            onClick={toggleTheme}
            title="Toggle Cyberpunk mode (Ctrl+Shift+X)"
            style={{
              background: isCyber ? theme.accentDim : 'transparent',
              border: `1px solid ${isCyber ? theme.accentBorder : theme.border}`,
              color: isCyber ? theme.accent : theme.fgDim,
              fontFamily: mono, fontSize: isCyber ? 10 : 8, letterSpacing: isCyber ? 3 : 2,
              padding: isCyber ? '5px 14px' : '4px 10px', cursor: 'pointer', textTransform: 'uppercase',
              transition: 'all 0.3s ease',
              fontWeight: isCyber ? 600 : 400,
              boxShadow: isCyber ? `0 0 12px ${theme.accentDim}, 0 0 24px ${theme.accentDim}, inset 0 0 10px ${theme.accentDim}` : 'none',
              textShadow: isCyber ? `0 0 6px ${theme.accent}, 0 0 12px ${theme.accent}` : 'none',
            }}
          >
            {isCyber ? '\u25c8 CYBER' : '\u25cb CYBER'}
          </button>
          <Link href="/about" style={{ fontSize: 11, letterSpacing: 2, color: theme.fgDim, textDecoration: 'none', textTransform: 'uppercase' }}>About</Link>
          <button
            onClick={() => {
              reset(); setBriefingVisible(false); setStatusText('READY'); setMapAgent(null); setModeText('SOLAR SYSTEM · EARTH');
              try { iframeRef.current?.contentWindow?.location.replace(SOLAR_DEFAULT); }
              catch { if (iframeRef.current) iframeRef.current.src = SOLAR_DEFAULT; }
            }}
            style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.fgDim, fontFamily: mono, fontSize: 8, letterSpacing: 2, padding: '4px 10px', cursor: 'pointer', textTransform: 'uppercase' }}
          >
            RESET
          </button>
        </div>
      </nav>

      {/* Sidebar */}
      <div style={{ position: 'fixed', top: 56, left: 0, bottom: 0, width: SIDEBAR_W, background: theme.bg, borderRight: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', zIndex: 70, fontFamily: mono, transition: 'background 0.5s ease, border-color 0.5s ease' }}>

        {/* Content area */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Empty state */}
          {showEmpty && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '32px 24px', textAlign: 'center' }}>
              {/* Concentric rings */}
              <div style={{ position: 'relative', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px solid ${theme.accentDim}`, animation: 'pulse 2.4s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', border: `1px solid ${theme.accentBorder}`, animation: 'pulse 2.4s ease-in-out infinite 0.4s' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: theme.accent, animation: 'pulse 1.6s ease-in-out infinite', boxShadow: isCyber ? `0 0 10px ${theme.accent}` : 'none' }} />
              </div>

              <div style={{ fontSize: isCyber ? 36 : 28, color: isCyber ? theme.accent : theme.fgMuted, textShadow: isCyber ? `0 0 12px ${theme.accent}, 0 0 30px ${theme.accent}` : 'none', opacity: isCyber ? 0.6 : 1 }}>{'\u25ce'}</div>
              <div style={{ fontSize: isCyber ? 12 : 10, letterSpacing: isCyber ? 3 : 2, lineHeight: 2, color: isCyber ? theme.fgDim : theme.fgMuted, textTransform: 'uppercase', textShadow: isCyber ? `0 0 6px ${theme.accent}` : 'none' }}>
                Ask about any location<br />or enter a query
              </div>
              <div style={{ fontSize: 8, color: theme.fgMuted, letterSpacing: 1 }}>
                paris {'\u00b7'} california {'\u00b7'} tokyo {'\u00b7'} odessa
              </div>
            </div>
          )}

          {/* Loading chips */}
          {showLoadingChips && (
            <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tools.map(chip => (
                <div key={chip.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: isCyber ? 11 : 9, letterSpacing: isCyber ? 3 : 2, color: chip.status === 'done' ? theme.fgMuted : (isCyber ? theme.fg : theme.fgDim), textTransform: 'uppercase', textShadow: isCyber && chip.status === 'running' ? `0 0 6px ${theme.accent}` : 'none' }}>
                  <div style={{ width: isCyber ? 7 : 5, height: isCyber ? 7 : 5, borderRadius: '50%', background: theme.accent, animation: chip.status === 'running' ? 'pulse 0.6s ease-in-out infinite' : 'none', opacity: chip.status === 'done' ? 0.2 : 1, flexShrink: 0, boxShadow: isCyber && chip.status === 'running' ? `0 0 8px ${theme.accent}, 0 0 16px ${theme.accent}` : 'none' }} />
                  {TOOL_LABELS[chip.name] ?? chip.name}
                </div>
              ))}
            </div>
          )}

          {/* Intel header */}
          {hasResults && (
            <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
              <div style={{ fontSize: isCyber ? 10 : 8, letterSpacing: isCyber ? 5 : 4, color: isCyber ? theme.accent : theme.fgDim, textTransform: 'uppercase', marginBottom: 5, textShadow: isCyber ? `0 0 8px ${theme.accent}, 0 0 16px ${theme.accent}` : 'none' }}>Intelligence Brief</div>
              <div style={{ fontSize: isCyber ? 16 : 13, fontWeight: 700, color: theme.accent, letterSpacing: isCyber ? 2 : 1, textShadow: isCyber ? `0 0 8px ${theme.accent}, 0 0 20px ${theme.accent}, 0 0 40px ${theme.accent}` : 'none' }}>
                {location?.name.toUpperCase() ?? '\u2014'}
              </div>
              <div style={{ fontSize: 9, color: theme.fgDim, marginTop: 2 }}>
                {location ? `${location.lat.toFixed(2)}\u00b0N  ${location.lng.toFixed(2)}\u00b0E` : '\u2014'}
              </div>
            </div>
          )}

          {/* Mini map — shown as soon as geocode returns */}
          {location && (
            <div style={{ position: 'relative', height: 175, flexShrink: 0, overflow: 'hidden', borderBottom: `1px solid ${theme.border}` }}>
              <iframe
                key={`${location.lat},${location.lng}`}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.35},${location.lat - 0.22},${location.lng + 0.35},${location.lat + 0.22}&layer=mapnik&marker=${location.lat},${location.lng}`}
                style={{ width: '100%', height: 220, border: 'none', marginTop: -22, filter: isCyber ? 'invert(1) hue-rotate(220deg) brightness(0.7) saturate(1.4)' : 'invert(1) hue-rotate(180deg) brightness(0.8) saturate(0.9)', display: 'block' }}
                title="Location map"
                sandbox="allow-scripts allow-same-origin"
              />
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(to right, ${theme.accentBorder}, transparent)`, pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: 7, left: 10, fontSize: isCyber ? 9 : 7, letterSpacing: isCyber ? 3 : 2, color: theme.accent, opacity: 0.75, textTransform: 'uppercase', pointerEvents: 'none', fontFamily: mono, textShadow: isCyber ? `0 0 6px ${theme.accent}, 0 0 14px ${theme.accent}` : 'none' }}>
                {location.lat.toFixed(4)}{'\u00b0'}N {'\u00b7'} {location.lng.toFixed(4)}{'\u00b0'}E
              </div>
              <div style={{ position: 'absolute', top: 7, left: 7, width: 10, height: 10, borderTop: `1px solid ${theme.accentBorder}`, borderLeft: `1px solid ${theme.accentBorder}`, pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: 7, right: 7, width: 10, height: 10, borderTop: `1px solid ${theme.accentBorder}`, borderRight: `1px solid ${theme.accentBorder}`, pointerEvents: 'none' }} />
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
            <div style={{ padding: '8px 16px', borderTop: `1px solid ${theme.border}`, fontSize: 7, color: theme.fgMuted, letterSpacing: 2, flexShrink: 0 }}>
              OPEN-METEO {'\u00b7'} NASA EONET {'\u00b7'} USGS {'\u00b7'} GDELT {'\u00b7'} ACLED
            </div>
          )}
        </div>

        {/* Jarvis HUD loader — above the orb while agents work */}
        <JarvisLoader active={isLoading} agentLabel={agentMode ? `${agentMode.toUpperCase()} AGENT` : 'SCANNING'} />

        {/* Omni Orb + Voice toggle */}
        <VoiceOrbStatus isSpeaking={isSpeaking} analyser={analyserRef.current} />

        {/* Mic waveform — your voice */}
        <MicWaveform analyser={micAnalyserRef.current} isActive={isListening} />

        <SearchBar
          inputRef={inpRef}
          value={inputVal}
          onChange={setInputVal}
          onSubmit={submitTextQuery}
          onMicToggle={toggleVoice}
          isLoading={isLoading}
          isScanning={isScanning}
          isListening={isListening}
          voiceMode={voiceMode}
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

      {/* Hidden phone trigger */}
      <button
        onClick={triggerNasaCall}
        style={{
          position: 'fixed', bottom: 8, right: 90,
          background: 'transparent', border: 'none', padding: 6,
          color: theme.fgMuted, cursor: 'pointer', opacity: 0.25,
          zIndex: 71, transition: 'opacity 0.3s',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.6'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '0.25'; }}
        title="Incoming call"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
        </svg>
      </button>

      {/* NASA call popup */}
      <NasaCallPopup
        visible={nasaPopupVisible}
        onAccept={handleNasaAccept}
        onDismiss={handleNasaDismiss}
      />

      {/* Vader call popup */}
      <VaderCallPopup
        visible={vaderPopupVisible}
        onAccept={() => {}}
        onDismiss={handleVaderDismiss}
        onVideoEnd={handleVaderVideoEnd}
      />

      {/* Watermark */}
      <div style={{ position: 'fixed', bottom: 10, right: 18, fontSize: 7, letterSpacing: 3, color: theme.fgMuted, textTransform: 'uppercase', pointerEvents: 'none', zIndex: 70, fontFamily: mono }}>
        OmniCAT {'\u00b7'} 2026
      </div>
    </>
  );
}