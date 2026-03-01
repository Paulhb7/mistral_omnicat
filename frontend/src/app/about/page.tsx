'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useChat } from '@/hooks/use-chat';
import { useTheme } from '@/context/theme-context';
import { sfxActivate, sfxDeactivate, sfxListening, sfxSubmit, sfxSpeakStart, sfxComplete } from '@/utils/sfx';

const OmniOrb = dynamic(() => import('@/components/omni-orb').then(m => ({ default: m.OmniOrb })), { ssr: false });

const mono = "'Roboto Mono', monospace";
const sans = "'Plus Jakarta Sans', system-ui, sans-serif";

const agents = [
  { icon: '🚢', name: 'Maritime', desc: 'Real-time vessel tracking & AIS data' },
  { icon: '✈️', name: 'Aviation', desc: 'Flight tracking & aircraft identification' },
  { icon: '💀', name: 'Doomsday', desc: 'Earthquakes, wildfires, storms & floods' },
  { icon: '⚔️', name: 'Conflict', desc: 'Armed conflicts, protests & news intel' },
  { icon: '☀️', name: 'Solar', desc: 'Solar flares & near-Earth objects' },
  { icon: '🌌', name: 'Milky Way', desc: 'Exoplanet research & scientific papers' },
];

const steps = [
  { n: '01', label: 'Query', desc: 'Speak or type' },
  { n: '02', label: 'Route', desc: 'LLM selects agents' },
  { n: '03', label: 'Tools', desc: 'Live API calls' },
  { n: '04', label: 'Brief', desc: 'Streamed response' },
  { n: '05', label: 'Voice', desc: 'Spoken aloud' },
];

const sources = [
  'Mistral AI', 'AIS Stream', 'OpenSky', 'NASA EONET', 'USGS',
  'ACLED', 'GDELT', 'NASA DONKI', 'NASA NeoWs', 'Exoplanet Archive',
  'arXiv', 'Nominatim', 'Open-Meteo', 'ElevenLabs', 'Voxtral', 'Perplexity',
];

export default function AboutPage() {
  const { theme } = useTheme();
  const { send, briefing, isLoading } = useChat();

  // ── Voice state ──────────────────────────────────────────────────────────
  const [voiceMode, setVoiceMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [statusText, setStatusText] = useState('TAP TO SPEAK');

  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sttWsRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);
  const transcriptRef = useRef('');
  const voiceModeRef = useRef(false);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const handleSearchRef = useRef<(q: string) => void>(() => {});
  const prevBriefingRef = useRef<string | null>(null);

  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);

  // ── Audio context ──────────────────────────────────────────────────────
  const ensureAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    if (!analyserRef.current) {
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
    }
    return { ctx: audioCtxRef.current, analyser: analyserRef.current };
  }, []);

  // ── Cleanup helpers ────────────────────────────────────────────────────
  const stopMicAndWs = useCallback(() => {
    if (scriptNodeRef.current) { scriptNodeRef.current.disconnect(); scriptNodeRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach(t => t.stop()); micStreamRef.current = null; }
    if (sttWsRef.current && sttWsRef.current.readyState <= WebSocket.OPEN) { sttWsRef.current.close(); sttWsRef.current = null; }
  }, []);

  const stopTts = useCallback(() => {
    if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current.src = ''; ttsAudioRef.current = null; }
  }, []);

  // ── STT — realtime via Voxtral WebSocket ──────────────────────────────
  const startListening = useCallback(async () => {
    stopMicAndWs();
    transcriptRef.current = '';

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true } });
    } catch { return; }
    micStreamRef.current = stream;

    setIsListening(true);
    setStatusText('LISTENING . . .');
    sfxListening();

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
      setStatusText('THINKING . . .');
      handleSearchRef.current(text);
    };

    ws.onopen = () => {
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
        setStatusText(`HEARD: ${transcriptRef.current.slice(-30)}`);
      } else if (msg.type === 'done') { submitTranscript(); }
      else if (msg.type === 'error') {
        stopMicAndWs(); setIsListening(false); setStatusText('TAP TO SPEAK');
        if (voiceModeRef.current) setTimeout(() => { if (voiceModeRef.current) startListening(); }, 1000);
      }
    };

    ws.onerror = () => { stopMicAndWs(); setIsListening(false); setStatusText('TAP TO SPEAK'); };
    ws.onclose = () => submitTranscript();
  }, [stopMicAndWs]);

  // ── TTS — speak via ElevenLabs ────────────────────────────────────────
  const speak = useCallback(async (text: string) => {
    if (!voiceModeRef.current || !text) return;
    stopTts();

    const { ctx, analyser } = ensureAudioCtx();
    if (ctx.state === 'suspended') await ctx.resume();

    setIsSpeaking(true);
    setStatusText('SPEAKING . . .');
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

      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        ttsAudioRef.current = null;
        if (voiceModeRef.current) { setStatusText('LISTENING . . .'); startListening(); }
        else setStatusText('TAP TO SPEAK');
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        ttsAudioRef.current = null;
        setStatusText('TAP TO SPEAK');
      };

      await audio.play();
    } catch {
      setIsSpeaking(false);
      if (voiceModeRef.current) { setStatusText('LISTENING . . .'); startListening(); }
      else setStatusText('TAP TO SPEAK');
    }
  }, [ensureAudioCtx, startListening, stopTts]);

  // ── Toggle voice mode ─────────────────────────────────────────────────
  const toggleVoice = useCallback(() => {
    if (voiceMode) {
      sfxDeactivate();
      setVoiceMode(false);
      setIsListening(false);
      setIsSpeaking(false);
      stopTts();
      stopMicAndWs();
      setStatusText('TAP TO SPEAK');
    } else {
      sfxActivate();
      setVoiceMode(true);
      ensureAudioCtx();
      startListening();
    }
  }, [voiceMode, ensureAudioCtx, startListening, stopMicAndWs, stopTts]);

  // ── Send query to backend ─────────────────────────────────────────────
  const handleSearch = useCallback(async (q: string) => {
    await send(q.trim());
  }, [send]);

  useEffect(() => { handleSearchRef.current = handleSearch; }, [handleSearch]);

  // ── Speak briefing when it arrives ────────────────────────────────────
  useEffect(() => {
    if (voiceMode && briefing && !isLoading && briefing !== prevBriefingRef.current) {
      prevBriefingRef.current = briefing;
      sfxComplete();
      const clean = briefing.replace(/[#*_\[\]()>`|\\-]/g, '').replace(/\n+/g, '. ');
      speak(clean);
    }
  }, [voiceMode, briefing, isLoading, speak]);

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.fg, fontFamily: sans, display: 'flex' }}>

      {/* ── Left: Omni Voice Zone ───────────────────────────────────────── */}
      <div style={{
        width: '35%', minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        borderRight: `1px solid ${theme.border}`,
        position: 'relative',
      }}>
        {/* Subtle glow behind orb */}
        <div aria-hidden style={{
          position: 'absolute', width: 320, height: 320, borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.accent}15 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <OmniOrb isSpeaking={isSpeaking} analyser={analyserRef.current} />

        {/* Status text */}
        <div style={{
          fontSize: 8, letterSpacing: 4, color: isSpeaking ? theme.accent : theme.fgMuted,
          textTransform: 'uppercase', fontFamily: mono, marginTop: 8,
          animation: isSpeaking || isListening ? 'pulse 1.2s ease-in-out infinite' : 'none',
        }}>
          {statusText}
        </div>

        {/* Mic button */}
        <button
          onClick={toggleVoice}
          style={{
            marginTop: 28, width: 56, height: 56, borderRadius: '50%',
            background: voiceMode ? theme.accent : 'transparent',
            border: `2px solid ${voiceMode ? theme.accent : theme.fgMuted}`,
            color: voiceMode ? theme.bg : theme.fgMuted,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.3s ease',
            boxShadow: voiceMode ? `0 0 20px ${theme.accent}60, 0 0 40px ${theme.accent}30` : 'none',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>

        <div style={{
          fontSize: 7, letterSpacing: 3, color: theme.fgMuted, fontFamily: mono,
          textTransform: 'uppercase', marginTop: 12,
        }}>
          Ask Omni
        </div>
      </div>

      {/* ── Right: Slide Content ────────────────────────────────────────── */}
      <div style={{
        width: '65%', minHeight: '100vh',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 64px',
      }}>

        {/* Nav links */}
        <div style={{
          position: 'fixed', top: 0, right: 0, padding: '18px 32px',
          display: 'flex', alignItems: 'center', gap: 24, zIndex: 50,
          fontFamily: mono,
        }}>
          <Link href="/" style={{ fontSize: 10, letterSpacing: 2, color: theme.fgMuted, textDecoration: 'none', textTransform: 'uppercase' }}>
            Home
          </Link>
          <Link href="/chat" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 16px',
            background: theme.accent, color: theme.bg,
            fontSize: 10, fontWeight: 700, letterSpacing: 2,
            textDecoration: 'none', textTransform: 'uppercase',
          }}>
            Launch {'\u2192'}
          </Link>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 48 }}>
          <div style={{
            fontSize: 10, letterSpacing: 4, color: theme.accent, fontFamily: mono,
            textTransform: 'uppercase', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: theme.accent, display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
            Multi-Agent OSINT Platform
          </div>
          <h1 style={{
            fontSize: 'clamp(36px, 4vw, 52px)', fontWeight: 700,
            letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 14,
          }}>
            Omni<span style={{ color: theme.accent }}>CAT</span>
          </h1>
          <p style={{ fontSize: 15, color: theme.fgDim, lineHeight: 1.7, maxWidth: 560 }}>
            Speak or type a query — the orchestrator routes to specialist agents, calls live APIs,
            and delivers a structured intelligence briefing you can read or listen to.
          </p>
        </div>

        {/* Flow steps */}
        <div style={{
          display: 'flex', gap: 2, marginBottom: 40,
        }}>
          {steps.map(({ n, label, desc }) => (
            <div key={n} style={{
              flex: 1, padding: '14px 16px',
              background: `${theme.fg}08`,
              borderTop: `2px solid ${theme.accent}30`,
            }}>
              <div style={{ fontSize: 8, letterSpacing: 3, color: theme.accent, fontFamily: mono, marginBottom: 4 }}>{n}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 11, color: theme.fgMuted }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* Agents grid */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            fontSize: 7, letterSpacing: 4, color: theme.fgMuted, fontFamily: mono,
            textTransform: 'uppercase', marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            Specialist agents
            <div style={{ flex: 1, height: 1, background: `${theme.fg}10` }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            {agents.map(a => (
              <div key={a.name} style={{
                padding: '14px 18px', background: `${theme.fg}06`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 16 }}>{a.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>{a.name}</span>
                </div>
                <div style={{ fontSize: 11, color: theme.fgMuted, lineHeight: 1.5 }}>{a.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Data sources */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            fontSize: 7, letterSpacing: 4, color: theme.fgMuted, fontFamily: mono,
            textTransform: 'uppercase', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            Data sources
            <div style={{ flex: 1, height: 1, background: `${theme.fg}10` }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {sources.map(s => (
              <span key={s} style={{
                fontSize: 9, letterSpacing: 1, padding: '3px 10px',
                border: `1px solid ${theme.accent}25`,
                color: theme.accent, fontFamily: mono,
                textTransform: 'uppercase',
              }}>
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Tech stack — single line */}
        <div style={{
          fontSize: 11, color: theme.fgMuted, fontFamily: mono, letterSpacing: 1,
        }}>
          Mistral Large {'\u00b7'} Strands Agents {'\u00b7'} Voxtral STT {'\u00b7'} ElevenLabs TTS {'\u00b7'} FastAPI {'\u00b7'} Next.js 15 {'\u00b7'} Three.js
        </div>

        {/* Watermark */}
        <div style={{
          position: 'fixed', bottom: 14, right: 24,
          fontSize: 7, letterSpacing: 3, color: theme.fgMuted,
          fontFamily: mono, textTransform: 'uppercase',
        }}>
          OmniCAT {'\u00b7'} 2026
        </div>
      </div>
    </div>
  );
}
