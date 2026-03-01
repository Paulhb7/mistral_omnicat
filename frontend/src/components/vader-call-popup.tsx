'use client';

import { useEffect, useRef, useState } from 'react';

type Phase = 'incoming' | 'video';

interface SpaceCallProps {
  visible: boolean;
  onAccept: () => void;
  onDismiss: () => void;
  onVideoEnd?: () => void;
}

const mono = "'Roboto Mono', monospace";

export function VaderCallPopup({ visible, onAccept, onDismiss, onVideoEnd }: SpaceCallProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>('incoming');

  useEffect(() => {
    if (visible) setPhase('incoming');
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && phase === 'incoming') { e.preventDefault(); handleAccept(); }
      if (e.key === 'Escape') { e.preventDefault(); onDismiss(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, phase, onDismiss]);

  useEffect(() => {
    if (phase === 'video' && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [phase]);

  function handleAccept() {
    setPhase('video');
    onAccept();
  }

  if (!visible) return null;

  const accent = '#00f0ff';

  // ── Video ─────────────────────────────────────────────────────────────────
  if (phase === 'video') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(8px)',
        animation: 'scFadeIn 0.3s ease',
      }}>
        <div style={{ position: 'relative', maxWidth: 800, width: '92vw' }}>
          <button
            onClick={onDismiss}
            style={{
              position: 'absolute', top: -36, right: 0,
              background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.5)', fontFamily: mono,
              fontSize: 12, letterSpacing: 3, cursor: 'pointer',
              textTransform: 'uppercase', transition: 'color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >
            CLOSE &times;
          </button>

          <video
            ref={videoRef}
            src="/media/call_from_space.mp4"
            controls
            onEnded={onVideoEnd}
            style={{
              width: '100%', borderRadius: 2,
              border: `1px solid rgba(255,255,255,0.15)`,
              boxShadow: '0 0 30px rgba(0,0,0,0.5)',
            }}
          />
        </div>

        <style>{`@keyframes scFadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
      </div>
    );
  }

  // ── Incoming call ─────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(6px)',
      animation: 'scFadeIn 0.3s ease',
    }}>
      <div style={{
        fontFamily: mono, textAlign: 'center',
        animation: 'scSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* Pulsing dot */}
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: accent, margin: '0 auto 28px',
          boxShadow: `0 0 12px ${accent}, 0 0 24px ${accent}`,
          animation: 'scPulse 0.8s ease-in-out infinite',
        }} />

        {/* Title */}
        <div style={{
          fontSize: 11, letterSpacing: 6, color: accent,
          textTransform: 'uppercase',
          textShadow: `0 0 10px ${accent}`,
          marginBottom: 32,
        }}>
          incoming call from another galaxy
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
          <button
            onClick={handleAccept}
            style={{
              padding: '10px 28px',
              background: `rgba(0,240,255,0.08)`,
              border: `1px solid ${accent}`,
              borderRadius: 2,
              color: accent,
              fontFamily: mono, fontSize: 10, letterSpacing: 4,
              textTransform: 'uppercase', cursor: 'pointer',
              transition: 'all 0.2s',
              textShadow: `0 0 6px ${accent}`,
              boxShadow: `0 0 12px rgba(0,240,255,0.15)`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(0,240,255,0.18)';
              e.currentTarget.style.boxShadow = `0 0 24px rgba(0,240,255,0.3)`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(0,240,255,0.08)';
              e.currentTarget.style.boxShadow = '0 0 12px rgba(0,240,255,0.15)';
            }}
          >
            Accept
          </button>
          <button
            onClick={onDismiss}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 2,
              color: 'rgba(255,255,255,0.35)',
              fontFamily: mono, fontSize: 10, letterSpacing: 3,
              textTransform: 'uppercase', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.35)';
            }}
          >
            Deny
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scSlideIn {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes scPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
