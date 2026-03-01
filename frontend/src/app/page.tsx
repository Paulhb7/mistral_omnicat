'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useChat } from '@/hooks/use-chat';
import { useTheme } from '@/context/theme-context';
import { sfxActivate, sfxDeactivate, sfxListening, sfxSubmit, sfxSpeakStart, sfxComplete } from '@/utils/sfx';
import OrangeGlobe from '@/components/orange-globe';
import SpiralGalaxy from '@/components/spiral-galaxy';
import SolarSystem from '@/components/solar-system';

const OmniOrb = dynamic(() => import('@/components/omni-orb').then(m => ({ default: m.OmniOrb })), { ssr: false });

const mono = "'Roboto Mono', monospace";
const sans = "'Plus Jakarta Sans', system-ui, sans-serif";

export default function Home() {
  const { theme } = useTheme();
  const { send, briefing, isLoading } = useChat();

  // ── Slide state ────────────────────────────────────────────────────────
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 6;
  const goToSlide = useCallback((idx: number) => {
    setCurrentSlide(Math.max(0, Math.min(totalSlides - 1, idx)));
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlide(s => Math.min(s + 1, totalSlides - 1));
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide(s => Math.max(s - 1, 0));
  }, []);

  // Keyboard + scroll navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prevSlide();
      }
    };

    let lastWheel = 0;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheel < 600) return;
      lastWheel = now;
      if (e.deltaY > 0) nextSlide();
      else if (e.deltaY < 0) prevSlide();
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [nextSlide, prevSlide]);

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

  // ── Slide transition styles ───────────────────────────────────────────
  const slideStyle = (index: number): React.CSSProperties => ({
    position: 'absolute',
    inset: 0,
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.8s ease, transform 0.8s ease',
    opacity: currentSlide === index ? 1 : 0,
    transform: currentSlide === index
      ? 'translateY(0)'
      : currentSlide > index
        ? 'translateY(-60px)'
        : 'translateY(60px)',
    pointerEvents: currentSlide === index ? 'auto' : 'none',
  });

  return (
    <div style={{
      height: '100vh', overflow: 'hidden',
      background: theme.bg, color: theme.fg, fontFamily: sans,
      position: 'relative', cursor: 'default',
    }}>

      {/* Noise texture */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
      }} />

      {/* Accent glow */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 60% 40% at 10% 0%, ${theme.glow} 0%, transparent 60%)`,
      }} />

      {/* Wireframe globe — decorative, right side (slides 0-1) */}
      <div aria-hidden style={{
        position: 'fixed', zIndex: 1, pointerEvents: 'none',
        right: '-5vw', top: '50%', transform: 'translateY(-50%)',
        transition: 'opacity 0.8s ease',
        opacity: currentSlide <= 1 ? 1 : 0,
      }}>
        <OrangeGlobe size={680} opacity={0.22} />
      </div>

      {/* Wireframe globe — centered (slides 3 & 5) */}
      <div aria-hidden style={{
        position: 'fixed', zIndex: 1, pointerEvents: 'none',
        left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        transition: 'opacity 0.8s ease',
        opacity: currentSlide === 3 ? 1 : 0,
      }}>
        <OrangeGlobe size={520} opacity={0.35} />
      </div>

      {/* ── Navigation dots ─────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', right: 32, top: '50%', transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', gap: 14, zIndex: 100,
      }}>
        {Array.from({ length: totalSlides }).map((_, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i)}
            style={{
              width: currentSlide === i ? 10 : 6,
              height: currentSlide === i ? 10 : 6,
              borderRadius: '50%',
              border: `1.5px solid ${currentSlide === i ? theme.accent : theme.fgMuted}`,
              background: currentSlide === i ? theme.accent : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.4s ease',
              boxShadow: currentSlide === i ? `0 0 8px ${theme.accent}60` : 'none',
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* ── Slide nav hint ──────────────────────────────────────────────── */}
      {currentSlide < totalSlides - 1 && (
        <button
          onClick={nextSlide}
          style={{
            position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
            zIndex: 100, background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            animation: 'pulse 2s ease-in-out infinite',
          }}
        >
          <span style={{
            fontSize: 7, letterSpacing: 4, color: theme.fgMuted,
            fontFamily: mono, textTransform: 'uppercase',
          }}>
            Scroll
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.fgMuted} strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </button>
      )}

      {/* ── Nav links ───────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, padding: '20px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 100, fontFamily: mono,
      }}>
        <span style={{
          fontSize: 13, fontWeight: 500, letterSpacing: 4, color: theme.accent,
        }}>
          Omni<strong>CAT</strong>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/about" style={{
            fontSize: 10, letterSpacing: 2, color: theme.fgMuted,
            textDecoration: 'none', textTransform: 'uppercase',
          }}>
            Architecture
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
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SLIDE 0 — The World is Changing
          ════════════════════════════════════════════════════════════════════ */}
      <div style={slideStyle(0)}>
        <div style={{ maxWidth: 800, padding: '0 40px', textAlign: 'center' }}>

          {/* Subtle accent line */}
          <div style={{
            width: 40, height: 2, background: theme.accent,
            margin: '0 auto 40px', opacity: 0.6,
          }} />

          <h1 style={{
            fontSize: 'clamp(42px, 6vw, 72px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            marginBottom: 36,
          }}>
            Our world has <span style={{ color: theme.accent }}>changed.</span>
          </h1>

          <p style={{
            fontSize: 'clamp(16px, 2vw, 22px)',
            color: theme.fgDim,
            lineHeight: 1.7,
            maxWidth: 600,
            margin: '0 auto 40px',
            fontWeight: 400,
          }}>
            Venezuela, Iran, Ukraine, Gaza, earthquakes, solar storms,
            rising sea levels, military escalations&nbsp;&mdash;&nbsp;the pace of global crises
            is accelerating faster than any human can track.
          </p>

          {/* Crisis tags */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
            gap: 8, marginBottom: 48,
          }}>
            {['Geopolitics', 'Natural disasters', 'Armed conflicts', 'Space weather', 'Maritime security', 'Aviation'].map(tag => (
              <span key={tag} style={{
                fontSize: 9, letterSpacing: 2, padding: '5px 14px',
                border: `1px solid ${theme.accent}30`,
                color: theme.accent, fontFamily: mono,
                textTransform: 'uppercase',
              }}>
                {tag}
              </span>
            ))}
          </div>

          <p style={{
            fontSize: 14, color: theme.fgMuted, fontFamily: mono,
            letterSpacing: 2, textTransform: 'uppercase',
          }}>
            How do you keep up?
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SLIDE 1 — Technology Too / OmniCAT
          ════════════════════════════════════════════════════════════════════ */}
      <div style={slideStyle(1)}>
        <div style={{ maxWidth: 800, padding: '0 40px', textAlign: 'center' }}>

          <div style={{
            fontSize: 10, letterSpacing: 4, color: theme.accent, fontFamily: mono,
            textTransform: 'uppercase', marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <div style={{ width: 30, height: 1, background: theme.accent, opacity: 0.4 }} />
            Technology evolves too
            <div style={{ width: 30, height: 1, background: theme.accent, opacity: 0.4 }} />
          </div>

          <h1 style={{
            fontSize: 'clamp(52px, 8vw, 100px)',
            fontWeight: 700,
            letterSpacing: '-0.04em',
            lineHeight: 1.0,
            marginBottom: 28,
          }}>
            Omni<span style={{ color: theme.accent }}>CAT</span>
          </h1>

          <p style={{
            fontSize: 'clamp(16px, 2vw, 20px)',
            color: theme.fgDim,
            maxWidth: 560,
            margin: '0 auto 16px',
            lineHeight: 1.6,
            fontFamily: mono,
            letterSpacing: '0.02em',
            fontStyle: 'italic',
          }}>
            The secret son of Jarvis, Palantir and Mistral.
          </p>

          <p style={{
            fontSize: 'clamp(15px, 1.8vw, 19px)',
            color: theme.fgDim,
            maxWidth: 560,
            margin: '0 auto 44px',
            lineHeight: 1.7,
          }}>
            to better understand
          </p>

          {/* Scale badges */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
            gap: 8,
          }}>
            {['Local', 'National', 'Global', 'Solar', 'Galactic'].map(tag => (
              <span key={tag} style={{
                fontSize: 9, letterSpacing: 3, padding: '6px 16px',
                border: `1px solid ${theme.accent}25`,
                background: `${theme.accent}08`,
                color: theme.accent, fontFamily: mono,
                textTransform: 'uppercase',
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SLIDE 2 — OmniOrb Voice Interface
          ════════════════════════════════════════════════════════════════════ */}
      <div style={slideStyle(2)}>
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>

          {/* Subtle glow behind orb */}
          <div aria-hidden style={{
            position: 'absolute', width: 400, height: 400, borderRadius: '50%',
            background: `radial-gradient(circle, ${theme.accent}12 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />

          <OmniOrb isSpeaking={isSpeaking} analyser={analyserRef.current} />

          {/* Status text */}
          <div style={{
            fontSize: 9, letterSpacing: 5, color: isSpeaking ? theme.accent : theme.fgMuted,
            textTransform: 'uppercase', fontFamily: mono, marginTop: 12,
            animation: isSpeaking || isListening ? 'pulse 1.2s ease-in-out infinite' : 'none',
          }}>
            {statusText}
          </div>

          {/* Mic button */}
          <button
            onClick={toggleVoice}
            style={{
              marginTop: 32, width: 64, height: 64, borderRadius: '50%',
              background: voiceMode ? theme.accent : 'transparent',
              border: `2px solid ${voiceMode ? theme.accent : theme.fgMuted}`,
              color: voiceMode ? theme.bg : theme.fgMuted,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s ease',
              boxShadow: voiceMode ? `0 0 24px ${theme.accent}60, 0 0 48px ${theme.accent}30` : 'none',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>

          <div style={{
            fontSize: 8, letterSpacing: 4, color: theme.fgMuted, fontFamily: mono,
            textTransform: 'uppercase', marginTop: 14,
          }}>
            Ask Omni anything
          </div>

          {/* Quick suggestion chips */}
          <div style={{
            display: 'flex', gap: 8, marginTop: 32, flexWrap: 'wrap',
            justifyContent: 'center', maxWidth: 500,
          }}>
            {[
              'What conflicts are active right now?',
              'Any earthquakes today?',
              'Track vessels near Gibraltar',
            ].map(q => (
              <button
                key={q}
                onClick={() => { handleSearch(q); setStatusText('THINKING . . .'); }}
                style={{
                  fontSize: 9, letterSpacing: 1, padding: '6px 14px',
                  border: `1px solid ${theme.accent}20`,
                  background: `${theme.fg}04`,
                  color: theme.fgDim, fontFamily: mono,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SLIDE 3 — Earth Intelligence
          ════════════════════════════════════════════════════════════════════ */}
      <div style={slideStyle(3)}>
        {/* Title */}
        <div style={{ position: 'absolute', top: 56, left: 0, right: 0, textAlign: 'center', zIndex: 2 }}>
          <div style={{ fontSize: 9, letterSpacing: 4, color: theme.accent, fontFamily: mono, textTransform: 'uppercase', marginBottom: 8 }}>
            What Omni can do
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.03em' }}>
            <span style={{ color: theme.accent }}>Earth</span> Intelligence
          </h2>
        </div>

        {/* SVG connector lines */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
          <line x1="24%" y1="32%" x2="40%" y2="44%" stroke={theme.accent} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
          <circle cx="40%" cy="44%" r="3" fill={theme.accent} opacity="0.4" />
          <line x1="76%" y1="32%" x2="60%" y2="44%" stroke={theme.accent} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
          <circle cx="60%" cy="44%" r="3" fill={theme.accent} opacity="0.4" />
          <line x1="24%" y1="68%" x2="40%" y2="56%" stroke={theme.accent} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
          <circle cx="40%" cy="56%" r="3" fill={theme.accent} opacity="0.4" />
          <line x1="76%" y1="68%" x2="60%" y2="56%" stroke={theme.accent} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
          <circle cx="60%" cy="56%" r="3" fill={theme.accent} opacity="0.4" />
        </svg>

        {/* Bubbles — top-left: Maritime */}
        <div style={{ position: 'absolute', left: '5%', top: '22%', width: 240, zIndex: 3, padding: '16px 18px', border: `1px solid ${theme.accent}30`, background: `${theme.bg}dd`, backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>{'\uD83D\uDEA2'}</span>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>Maritime</span>
          </div>
          <div style={{ fontSize: 11, color: theme.fgDim, lineHeight: 1.5, marginBottom: 8 }}>Vessel tracking & AIS data worldwide in real-time</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['AISStream', 'SQLite'].map(s => <span key={s} style={{ fontSize: 7, letterSpacing: 1, padding: '2px 7px', border: `1px solid ${theme.accent}30`, color: theme.accent, fontFamily: mono, textTransform: 'uppercase' }}>{s}</span>)}
          </div>
        </div>

        {/* top-right: Aviation */}
        <div style={{ position: 'absolute', right: '5%', top: '22%', width: 240, zIndex: 3, padding: '16px 18px', border: `1px solid ${theme.accent}30`, background: `${theme.bg}dd`, backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>{'\u2708\uFE0F'}</span>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>Aviation</span>
          </div>
          <div style={{ fontSize: 11, color: theme.fgDim, lineHeight: 1.5, marginBottom: 8 }}>Flight tracking, aircraft identification & route monitoring</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['OpenSky', 'ADS-B'].map(s => <span key={s} style={{ fontSize: 7, letterSpacing: 1, padding: '2px 7px', border: `1px solid ${theme.accent}30`, color: theme.accent, fontFamily: mono, textTransform: 'uppercase' }}>{s}</span>)}
          </div>
        </div>

        {/* bottom-left: Doomsday */}
        <div style={{ position: 'absolute', left: '5%', bottom: '22%', width: 240, zIndex: 3, padding: '16px 18px', border: `1px solid ${theme.accent}30`, background: `${theme.bg}dd`, backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>{'\uD83D\uDC80'}</span>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>Doomsday</span>
          </div>
          <div style={{ fontSize: 11, color: theme.fgDim, lineHeight: 1.5, marginBottom: 8 }}>Earthquakes, wildfires, storms & natural disasters</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['NASA EONET', 'USGS'].map(s => <span key={s} style={{ fontSize: 7, letterSpacing: 1, padding: '2px 7px', border: `1px solid ${theme.accent}30`, color: theme.accent, fontFamily: mono, textTransform: 'uppercase' }}>{s}</span>)}
          </div>
        </div>

        {/* bottom-right: Conflict */}
        <div style={{ position: 'absolute', right: '5%', bottom: '22%', width: 240, zIndex: 3, padding: '16px 18px', border: `1px solid ${theme.accent}30`, background: `${theme.bg}dd`, backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>{'\u2694\uFE0F'}</span>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>Conflict</span>
          </div>
          <div style={{ fontSize: 11, color: theme.fgDim, lineHeight: 1.5, marginBottom: 8 }}>Armed conflicts, political violence & breaking news</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['ACLED', 'GDELT'].map(s => <span key={s} style={{ fontSize: 7, letterSpacing: 1, padding: '2px 7px', border: `1px solid ${theme.accent}30`, color: theme.accent, fontFamily: mono, textTransform: 'uppercase' }}>{s}</span>)}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SLIDE 4 — Solar System Watch
          ════════════════════════════════════════════════════════════════════ */}
      <div style={slideStyle(4)}>
        {/* Title */}
        <div style={{ position: 'absolute', top: 56, left: 0, right: 0, textAlign: 'center', zIndex: 2 }}>
          <div style={{ fontSize: 9, letterSpacing: 4, color: theme.accent, fontFamily: mono, textTransform: 'uppercase', marginBottom: 8 }}>
            What Omni can do
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.03em' }}>
            <span style={{ color: theme.accent }}>Solar System</span> Watch
          </h2>
        </div>

        {/* 3D Solar System — canvas-based with tilted orbits */}
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 1, pointerEvents: 'none' }}>
          <SolarSystem size={540} opacity={0.9} />
        </div>

        {/* SVG connector lines — from bubbles to solar system features */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
          {/* Left bubble → solar wind area (left of sun) */}
          <line x1="27%" y1="48%" x2="38%" y2="48%" stroke={theme.accent} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
          <circle cx="38%" cy="48%" r="3" fill={theme.accent} opacity="0.4" />
          {/* Right bubble → asteroid area (upper right) */}
          <line x1="73%" y1="42%" x2="62%" y2="40%" stroke={theme.accent} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
          <circle cx="62%" cy="40%" r="3" fill={theme.accent} opacity="0.4" />
        </svg>

        {/* left: Solar Flares */}
        <div style={{ position: 'absolute', left: '4%', top: '38%', width: 260, zIndex: 3, padding: '20px 22px', border: `1px solid ${theme.accent}30`, background: `${theme.bg}dd`, backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 24 }}>{'\uD83C\uDF1E'}</span>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.5 }}>Solar Flares</span>
          </div>
          <div style={{ fontSize: 12, color: theme.fgDim, lineHeight: 1.5, marginBottom: 10 }}>Real-time detection of solar flares and coronal mass ejections that can disrupt communications</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <span style={{ fontSize: 7, letterSpacing: 1, padding: '2px 7px', border: `1px solid ${theme.accent}30`, color: theme.accent, fontFamily: mono, textTransform: 'uppercase' }}>NASA DONKI</span>
          </div>
        </div>

        {/* right: Near-Earth Objects */}
        <div style={{ position: 'absolute', right: '4%', top: '30%', width: 260, zIndex: 3, padding: '20px 22px', border: `1px solid ${theme.accent}30`, background: `${theme.bg}dd`, backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 24 }}>{'\u2604\uFE0F'}</span>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.5 }}>Near-Earth Objects</span>
          </div>
          <div style={{ fontSize: 12, color: theme.fgDim, lineHeight: 1.5, marginBottom: 10 }}>Track asteroids and comets approaching Earth with risk assessment and trajectory data</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <span style={{ fontSize: 7, letterSpacing: 1, padding: '2px 7px', border: `1px solid ${theme.accent}30`, color: theme.accent, fontFamily: mono, textTransform: 'uppercase' }}>NASA NeoWs</span>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SLIDE 5 — Galaxy Explorer
          ════════════════════════════════════════════════════════════════════ */}
      <div style={slideStyle(5)}>
        {/* Title */}
        <div style={{ position: 'absolute', top: 56, left: 0, right: 0, textAlign: 'center', zIndex: 2 }}>
          <div style={{ fontSize: 9, letterSpacing: 4, color: theme.accent, fontFamily: mono, textTransform: 'uppercase', marginBottom: 8 }}>
            What Omni can do
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.03em' }}>
            <span style={{ color: theme.accent }}>Galaxy</span> Explorer
          </h2>
        </div>

        {/* Milky Way Galaxy — canvas-based particle spiral */}
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 1, pointerEvents: 'none' }}>
          <SpiralGalaxy size={560} opacity={0.85} />
        </div>

        {/* SVG connector lines */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
          {/* Left bubble → exoplanet on arm */}
          <line x1="27%" y1="52%" x2="40%" y2="55%" stroke={theme.accent} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
          <circle cx="40%" cy="55%" r="3" fill={theme.accent} opacity="0.4" />
          {/* Right bubble → galaxy core / research area */}
          <line x1="73%" y1="50%" x2="58%" y2="48%" stroke={theme.accent} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
          <circle cx="58%" cy="48%" r="3" fill={theme.accent} opacity="0.4" />
        </svg>

        {/* left: Exoplanets */}
        <div style={{ position: 'absolute', left: '4%', top: '42%', width: 260, zIndex: 3, padding: '20px 22px', border: `1px solid ${theme.accent}30`, background: `${theme.bg}dd`, backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 24 }}>{'\uD83E\uDE90'}</span>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.5 }}>Exoplanets</span>
          </div>
          <div style={{ fontSize: 12, color: theme.fgDim, lineHeight: 1.5, marginBottom: 10 }}>Query NASA&apos;s catalog of confirmed exoplanets with orbital parameters and habitability metrics</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <span style={{ fontSize: 7, letterSpacing: 1, padding: '2px 7px', border: `1px solid ${theme.accent}30`, color: theme.accent, fontFamily: mono, textTransform: 'uppercase' }}>Exoplanet Archive</span>
          </div>
        </div>

        {/* right: Research Papers */}
        <div style={{ position: 'absolute', right: '4%', top: '40%', width: 260, zIndex: 3, padding: '20px 22px', border: `1px solid ${theme.accent}30`, background: `${theme.bg}dd`, backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 24 }}>{'\uD83D\uDCDA'}</span>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.5 }}>Research Papers</span>
          </div>
          <div style={{ fontSize: 12, color: theme.fgDim, lineHeight: 1.5, marginBottom: 10 }}>Search and summarize the latest astrophysics papers from arXiv with citation analysis</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <span style={{ fontSize: 7, letterSpacing: 1, padding: '2px 7px', border: `1px solid ${theme.accent}30`, color: theme.accent, fontFamily: mono, textTransform: 'uppercase' }}>arXiv</span>
          </div>
        </div>
      </div>

      {/* Watermark */}
      <div style={{
        position: 'fixed', bottom: 14, right: 24, zIndex: 100,
        fontSize: 7, letterSpacing: 3, color: theme.fgMuted,
        fontFamily: mono, textTransform: 'uppercase',
      }}>
        Hackathon Mistral {'\u00b7'} 2026
      </div>
    </div>
  );
}
