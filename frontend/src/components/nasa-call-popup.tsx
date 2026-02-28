'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from '@/context/theme-context';

interface NasaCallPopupProps {
  visible: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}

const mono = "'Roboto Mono', monospace";

export function NasaCallPopup({ visible, onAccept, onDismiss }: NasaCallPopupProps) {
  const { theme, themeKey } = useTheme();
  const isCyber = themeKey === 'cyberpunk';
  const popupRef = useRef<HTMLDivElement>(null);

  // Accept on Enter, dismiss on Escape
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); onAccept(); }
      if (e.key === 'Escape') { e.preventDefault(); onDismiss(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onAccept, onDismiss]);

  if (!visible) return null;

  const accent = isCyber ? theme.accent : '#00ccff';
  const glow = isCyber
    ? `0 0 30px rgba(0,240,255,0.3), 0 0 60px rgba(0,240,255,0.15), inset 0 0 30px rgba(0,240,255,0.05)`
    : `0 0 30px rgba(0,200,255,0.25), 0 0 60px rgba(0,200,255,0.1)`;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(6px)',
      animation: 'fadeIn 0.3s ease',
    }}>
      <div
        ref={popupRef}
        style={{
          fontFamily: mono,
          background: isCyber ? 'rgba(10,14,30,0.95)' : 'rgba(12,12,16,0.95)',
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
          background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,200,255,0.015) 2px, rgba(0,200,255,0.015) 4px)`,
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
          {/* Pulsing dot */}
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#ff3333',
            boxShadow: '0 0 8px #ff3333, 0 0 16px #ff3333',
            animation: 'pulse 0.8s ease-in-out infinite',
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
          fontSize: 22, fontWeight: 700, letterSpacing: 3,
          color: '#ffffff',
          textShadow: `0 0 12px ${accent}, 0 0 24px ${accent}`,
          marginBottom: 6,
        }}>
          N A S A
        </div>
        <div style={{
          fontSize: 9, letterSpacing: 3, color: accent, opacity: 0.6,
          marginBottom: 20,
        }}>
          PRIORITY CHANNEL &middot; ENCRYPTED
        </div>

        {/* Message */}
        <div style={{
          padding: '14px 16px',
          background: isCyber ? 'rgba(0,240,255,0.04)' : 'rgba(0,200,255,0.04)',
          border: `1px solid ${isCyber ? 'rgba(0,240,255,0.12)' : 'rgba(0,200,255,0.1)'}`,
          borderRadius: 2,
          marginBottom: 24,
        }}>
          <div style={{
            fontSize: 12, fontStyle: 'italic', color: '#ddeeff',
            lineHeight: 1.7, letterSpacing: 0.5,
          }}>
            &ldquo;An asteroid has entered the solar system.&rdquo;
          </div>
          <div style={{
            fontSize: 8, letterSpacing: 3, color: accent, opacity: 0.5,
            marginTop: 8, textTransform: 'uppercase',
          }}>
            NASA &middot; Planetary Defense Coordination Office
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onAccept}
            style={{
              flex: 1, padding: '10px 0',
              background: isCyber ? 'rgba(0,240,255,0.1)' : 'rgba(0,200,255,0.1)',
              border: `1px solid ${accent}`,
              borderRadius: 2,
              color: accent,
              fontFamily: mono, fontSize: 10, letterSpacing: 4,
              textTransform: 'uppercase', cursor: 'pointer',
              transition: 'all 0.2s',
              textShadow: `0 0 6px ${accent}`,
              boxShadow: `0 0 12px ${isCyber ? 'rgba(0,240,255,0.15)' : 'rgba(0,200,255,0.12)'}`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isCyber ? 'rgba(0,240,255,0.2)' : 'rgba(0,200,255,0.2)';
              e.currentTarget.style.boxShadow = `0 0 20px ${accent}`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = isCyber ? 'rgba(0,240,255,0.1)' : 'rgba(0,200,255,0.1)';
              e.currentTarget.style.boxShadow = `0 0 12px ${isCyber ? 'rgba(0,240,255,0.15)' : 'rgba(0,200,255,0.12)'}`;
            }}
          >
            Accept Mission
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

      {/* Inline keyframe animations */}
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
      `}</style>
    </div>
  );
}
