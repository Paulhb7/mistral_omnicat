'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/context/theme-context';

type Phase = 'incoming' | 'video';

interface VaderCallPopupProps {
  visible: boolean;
  onAccept: () => void;
  onDismiss: () => void;
  onVideoEnd?: () => void;
}

const mono = "'Roboto Mono', monospace";

export function VaderCallPopup({ visible, onAccept, onDismiss, onVideoEnd }: VaderCallPopupProps) {
  const { themeKey } = useTheme();
  const isCyber = themeKey === 'cyberpunk';
  const popupRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>('incoming');

  // Reset phase when popup becomes visible
  useEffect(() => {
    if (visible) setPhase('incoming');
  }, [visible]);

  // Keyboard: Enter to accept (incoming only), Escape to dismiss
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && phase === 'incoming') {
        e.preventDefault();
        handleAccept();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, phase, onDismiss]);

  // Auto-play video when entering video phase
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

  const accent = '#ff2222';
  const accentDim = 'rgba(255,34,34,0.12)';
  const glow = `0 0 30px rgba(255,30,30,0.3), 0 0 60px rgba(255,30,30,0.15), inset 0 0 30px rgba(255,30,30,0.05)`;

  // ── Phase: Video ──────────────────────────────────────────────────────────
  if (phase === 'video') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.3s ease',
      }}>
        <div style={{ position: 'relative', maxWidth: 800, width: '92vw' }}>
          {/* Close button */}
          <button
            onClick={onDismiss}
            style={{
              position: 'absolute', top: -36, right: 0,
              background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.5)', fontFamily: mono,
              fontSize: 12, letterSpacing: 3, cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >
            CLOSE &times;
          </button>

          {/* Video player */}
          <video
            ref={videoRef}
            src="/media/call_from_space.mp4"
            controls
            onEnded={onVideoEnd}
            style={{
              width: '100%',
              borderRadius: 2,
              border: `1px solid ${accent}`,
              boxShadow: glow,
            }}
          />

          {/* Red scan line overlay */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 2,
            background: `repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,30,30,0.015) 3px, rgba(255,30,30,0.015) 6px)`,
          }} />
        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // ── Phase: Incoming call (Accept / Deny) ──────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(6px)',
      animation: 'fadeIn 0.3s ease',
    }}>
      <div
        ref={popupRef}
        style={{
          fontFamily: mono,
          background: isCyber ? 'rgba(14,6,10,0.96)' : 'rgba(14,8,8,0.96)',
          border: `1px solid ${accent}`,
          borderRadius: 2,
          padding: '28px 36px',
          maxWidth: 420,
          width: '90vw',
          boxShadow: glow,
          animation: 'popupSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Scan line effect */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,30,30,0.012) 2px, rgba(255,30,30,0.012) 4px)`,
        }} />

        {/* Top accent bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          animation: 'scanBar 2s ease-in-out infinite',
        }} />

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: accent,
            boxShadow: `0 0 8px ${accent}, 0 0 16px ${accent}`,
            animation: 'pulse 0.6s ease-in-out infinite',
          }} />
          <div style={{
            fontSize: 10, letterSpacing: 5, color: accent,
            textTransform: 'uppercase',
            textShadow: `0 0 8px ${accent}`,
          }}>
            INCOMING TRANSMISSION
          </div>
        </div>

        {/* Caller ID */}
        <div style={{
          fontSize: 22, fontWeight: 700, letterSpacing: 5,
          color: '#ffffff',
          textShadow: `0 0 12px ${accent}, 0 0 24px ${accent}`,
          marginBottom: 6,
        }}>
          D A R T H {'  '} V A D E R
        </div>
        <div style={{
          fontSize: 9, letterSpacing: 3, color: accent, opacity: 0.6,
          marginBottom: 20,
        }}>
          IMPERIAL CHANNEL &middot; DARK SIDE
        </div>

        {/* Message */}
        <div style={{
          padding: '14px 16px',
          background: accentDim,
          border: `1px solid rgba(255,34,34,0.15)`,
          borderRadius: 2,
          marginBottom: 24,
        }}>
          <div style={{
            fontSize: 12, fontStyle: 'italic', color: '#ffdde0',
            lineHeight: 1.7, letterSpacing: 0.5,
          }}>
            &ldquo;I find your lack of exoplanet data disturbing. Search the Milky Way, or face the consequences.&rdquo;
          </div>
          <div style={{
            fontSize: 8, letterSpacing: 3, color: accent, opacity: 0.5,
            marginTop: 8, textTransform: 'uppercase',
          }}>
            Galactic Empire &middot; Death Star Command
          </div>
        </div>

        {/* Buttons: Accept / Deny */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleAccept}
            style={{
              flex: 1, padding: '10px 0',
              background: accentDim,
              border: `1px solid ${accent}`,
              borderRadius: 2,
              color: accent,
              fontFamily: mono, fontSize: 10, letterSpacing: 4,
              textTransform: 'uppercase', cursor: 'pointer',
              transition: 'all 0.2s',
              textShadow: `0 0 6px ${accent}`,
              boxShadow: `0 0 12px rgba(255,34,34,0.15)`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,34,34,0.2)';
              e.currentTarget.style.boxShadow = `0 0 20px ${accent}`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = accentDim;
              e.currentTarget.style.boxShadow = '0 0 12px rgba(255,34,34,0.15)';
            }}
          >
            Accept
          </button>
          <button
            onClick={onDismiss}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: `1px solid rgba(255,255,255,0.12)`,
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

        {/* Corner brackets */}
        <div style={{ position: 'absolute', top: 6, left: 6, width: 10, height: 10, borderTop: `1px solid ${accent}`, borderLeft: `1px solid ${accent}`, opacity: 0.4, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 6, right: 6, width: 10, height: 10, borderTop: `1px solid ${accent}`, borderRight: `1px solid ${accent}`, opacity: 0.4, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 6, left: 6, width: 10, height: 10, borderBottom: `1px solid ${accent}`, borderLeft: `1px solid ${accent}`, opacity: 0.4, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 6, right: 6, width: 10, height: 10, borderBottom: `1px solid ${accent}`, borderRight: `1px solid ${accent}`, opacity: 0.4, pointerEvents: 'none' }} />
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popupSlideIn {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes scanBar {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}
