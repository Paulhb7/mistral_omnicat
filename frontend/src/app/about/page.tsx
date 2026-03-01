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

const AGENT_MODEL = 'Ministral 14B';

const agents = [
  { icon: '🚢', name: 'Maritime', desc: 'Vessel tracking & AIS data', sources: ['AISStream', 'SQLite'] },
  { icon: '✈️', name: 'Aviation', desc: 'Flight tracking & identification', sources: ['OpenSky', 'ADS-B'] },
  { icon: '💀', name: 'Doomsday', desc: 'Earthquakes, wildfires & storms', sources: ['NASA EONET', 'USGS'] },
  { icon: '⚔️', name: 'Conflict', desc: 'Armed conflicts & news intel', sources: ['ACLED', 'GDELT'] },
  { icon: '☀️', name: 'Solar', desc: 'Solar flares & near-Earth objects', sources: ['NASA DONKI', 'NeoWs'] },
  { icon: '🌌', name: 'Milky Way', desc: 'Exoplanet research & papers', sources: ['Exoplanet Archive', 'arXiv'] },
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
        <div style={{ marginBottom: 36 }}>
          <div style={{
            fontSize: 10, letterSpacing: 4, color: theme.accent, fontFamily: mono,
            textTransform: 'uppercase', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: theme.accent, display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
            Multi-Agent OSINT Platform
          </div>
          <h1 style={{
            fontSize: 'clamp(32px, 3.5vw, 46px)', fontWeight: 700,
            letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 10,
          }}>
            Omni<span style={{ color: theme.accent }}>CAT</span>
          </h1>
          <p style={{ fontSize: 14, color: theme.fgDim, lineHeight: 1.6, maxWidth: 540 }}>
            Speak or type a query — the orchestrator routes to specialist agents, calls live APIs,
            and delivers a structured intelligence briefing you can read or listen to.
          </p>
        </div>

        {/* ── Architecture Diagram ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontSize: 7, letterSpacing: 4, color: theme.fgMuted, fontFamily: mono,
            textTransform: 'uppercase', marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            Architecture
            <div style={{ flex: 1, height: 1, background: `${theme.fg}10` }} />
          </div>

          {/* User Voice */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              display: 'inline-block', padding: '10px 28px',
              border: `2px solid ${theme.accent}`,
              background: `${theme.accent}12`,
            }}>
              <div style={{ fontSize: 8, letterSpacing: 3, color: theme.accent, fontFamily: mono, textTransform: 'uppercase', marginBottom: 2 }}>
                User Voice
              </div>
              <div style={{ fontSize: 10, color: theme.fgDim, fontFamily: mono }}>
                Voxtral-realtime
              </div>
            </div>
          </div>

          {/* Arrow down */}
          <div style={{ textAlign: 'center', color: theme.accent, fontSize: 18, lineHeight: 1, margin: '4px 0' }}>
            {'\u25BC'}
          </div>

          {/* Orchestrator */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              display: 'inline-block', padding: '10px 28px',
              border: `2px solid ${theme.accent}`,
              background: `${theme.accent}12`,
            }}>
              <div style={{ fontSize: 8, letterSpacing: 3, color: theme.accent, fontFamily: mono, textTransform: 'uppercase', marginBottom: 2 }}>
                Orchestrator
              </div>
              <div style={{ fontSize: 10, color: theme.fgDim, fontFamily: mono }}>
                Mistral Large 675B
              </div>
            </div>
          </div>

          {/* Arrow down with fan-out lines */}
          <div style={{ textAlign: 'center', color: theme.accent, fontSize: 18, lineHeight: 1, margin: '4px 0' }}>
            {'\u25BC'}
          </div>

          {/* Agents grid with data sources */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
            {agents.map(a => (
              <div key={a.name} style={{
                padding: '12px 14px',
                border: `1px solid ${theme.accent}20`,
                background: `${theme.fg}05`,
                display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                  <span style={{ fontSize: 14 }}>{a.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{a.name}</span>
                  <span style={{ fontSize: 7, fontFamily: mono, letterSpacing: 1, color: theme.fgMuted, marginLeft: 'auto', textTransform: 'uppercase' }}>Agent</span>
                </div>
                <div style={{ fontSize: 7, fontFamily: mono, color: theme.accent, letterSpacing: 1, marginBottom: 6 }}>{AGENT_MODEL}</div>
                <div style={{ fontSize: 10, color: theme.fgDim, lineHeight: 1.4, marginBottom: 8 }}>{a.desc}</div>
                {/* Data sources tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 'auto' }}>
                  {a.sources.map(s => (
                    <span key={s} style={{
                      fontSize: 7, letterSpacing: 1, padding: '2px 6px',
                      border: `1px solid ${theme.accent}30`,
                      color: theme.accent, fontFamily: mono,
                      textTransform: 'uppercase',
                    }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Arrow down */}
          <div style={{ textAlign: 'center', color: theme.accent, fontSize: 18, lineHeight: 1, margin: '6px 0' }}>
            {'\u25BC'}
          </div>

          {/* Briefing output box */}
          <div style={{ textAlign: 'center' }}>
            <span style={{
              display: 'inline-block', padding: '7px 28px',
              border: `1px solid ${theme.accent}40`,
              background: `${theme.accent}10`,
              fontSize: 11, fontFamily: mono, letterSpacing: 2,
              color: theme.accent, textTransform: 'uppercase',
            }}>
              Omni&apos;s Voice — ElevenLabs Personalized Voice
            </span>
          </div>
        </div>

        {/* ── Shared tools ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 7, letterSpacing: 4, color: theme.fgMuted, fontFamily: mono,
            textTransform: 'uppercase', marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            Shared services
            <div style={{ flex: 1, height: 1, background: `${theme.fg}10` }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Nominatim', 'Open-Meteo', 'Perplexity', 'ElevenLabs TTS', 'Voxtral STT'].map(s => (
              <span key={s} style={{
                fontSize: 8, letterSpacing: 1, padding: '3px 10px',
                border: `1px solid ${theme.accent}25`,
                color: theme.accent, fontFamily: mono,
                textTransform: 'uppercase',
              }}>
                {s}
              </span>
            ))}
          </div>
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
