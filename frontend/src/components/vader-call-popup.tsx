'use client';

import { useEffect, useRef } from 'react';

interface VaderCallPopupProps {
  visible: boolean;
  onDismiss: () => void;
  onVideoEnd?: () => void;
}

const mono = "'Roboto Mono', monospace";

export function VaderCallPopup({ visible, onDismiss, onVideoEnd }: VaderCallPopupProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-play video when popup becomes visible
  useEffect(() => {
    if (visible && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [visible]);

  // Keyboard: Escape to dismiss
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onDismiss]);

  if (!visible) return null;

  const accent = '#ff2222';
  const glow = `0 0 30px rgba(255,30,30,0.3), 0 0 60px rgba(255,30,30,0.15), inset 0 0 30px rgba(255,30,30,0.05)`;

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
