'use client';

import { useTheme } from '@/context/theme-context';

interface JarvisLoaderProps {
  active: boolean;
  /** Agent currently running, shown as label */
  agentLabel?: string;
}

/**
 * Iron-Man-style HUD loader — concentric rotating rings with
 * tick marks, scanning arcs, and pulsing core.
 * Pure CSS animations, no JS animation loop needed.
 */
export function JarvisLoader({ active, agentLabel }: JarvisLoaderProps) {
  const { theme, themeKey } = useTheme();
  const isCyber = themeKey === 'cyberpunk';
  const accent = theme.accent;
  const dim = theme.accentDim;

  const size = 200;
  const cx = size / 2;

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        margin: '0 auto',
        opacity: active ? 1 : 0.5,
        transform: 'translateY(-40px)',
        transition: 'opacity 0.5s ease',
        filter: active ? 'none' : `drop-shadow(0 0 6px ${accent})`,
        pointerEvents: 'none',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          {/* Gradient for scanning arc */}
          <linearGradient id="jarvis-arc-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={accent} stopOpacity="0" />
            <stop offset="50%" stopColor={accent} stopOpacity="0.6" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
          {/* Glow filter */}
          <filter id="jarvis-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Ring 1 — outer, thin, rotates clockwise slowly ── */}
        <g style={{ transformOrigin: `${cx}px ${cx}px`, animation: `jarvis-spin ${active ? 8 : 60}s linear infinite` }}>
          <circle cx={cx} cy={cx} r={92} fill="none" stroke={accent} strokeWidth="0.5" strokeOpacity="0.2" />
          {/* Tick marks on outer ring */}
          {Array.from({ length: 36 }).map((_, i) => {
            const angle = (i * 10) * Math.PI / 180;
            const c = Math.cos(angle);
            const s = Math.sin(angle);
            const r1 = 88;
            const r2 = i % 3 === 0 ? 96 : 93;
            const opacity = i % 3 === 0 ? 0.5 : 0.2;
            return (
              <line
                key={`outer-${i}`}
                x1={Math.round((cx + c * r1) * 100) / 100}
                y1={Math.round((cx + s * r1) * 100) / 100}
                x2={Math.round((cx + c * r2) * 100) / 100}
                y2={Math.round((cx + s * r2) * 100) / 100}
                stroke={accent}
                strokeWidth="0.5"
                strokeOpacity={opacity}
              />
            );
          })}
        </g>

        {/* ── Ring 2 — counter-clockwise, dashed ── */}
        <g style={{ transformOrigin: `${cx}px ${cx}px`, animation: `jarvis-spin-reverse ${active ? 6 : 45}s linear infinite` }}>
          <circle
            cx={cx} cy={cx} r={78}
            fill="none" stroke={accent} strokeWidth="0.7"
            strokeDasharray="8 16" strokeOpacity="0.35"
          />
        </g>

        {/* ── Ring 3 — inner, thicker, rotates clockwise ── */}
        <g style={{ transformOrigin: `${cx}px ${cx}px`, animation: `jarvis-spin ${active ? 4 : 50}s linear infinite` }}>
          <circle cx={cx} cy={cx} r={62} fill="none" stroke={accent} strokeWidth="0.4" strokeOpacity="0.15" />
          {/* Short arc segments — the "scanning" feel */}
          <circle
            cx={cx} cy={cx} r={62}
            fill="none" stroke={accent} strokeWidth="1.5"
            strokeDasharray="20 60 30 80" strokeOpacity="0.5"
            filter="url(#jarvis-glow)"
          />
          {/* Inner tick marks */}
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i * 15) * Math.PI / 180;
            const c = Math.cos(angle);
            const s = Math.sin(angle);
            const r1 = 58;
            const r2 = 62;
            return (
              <line
                key={`inner-${i}`}
                x1={Math.round((cx + c * r1) * 100) / 100}
                y1={Math.round((cx + s * r1) * 100) / 100}
                x2={Math.round((cx + c * r2) * 100) / 100}
                y2={Math.round((cx + s * r2) * 100) / 100}
                stroke={accent}
                strokeWidth="0.5"
                strokeOpacity="0.3"
              />
            );
          })}
        </g>

        {/* ── Ring 4 — innermost, counter-clockwise, dotted ── */}
        <g style={{ transformOrigin: `${cx}px ${cx}px`, animation: `jarvis-spin-reverse ${active ? 3 : 40}s linear infinite` }}>
          <circle
            cx={cx} cy={cx} r={46}
            fill="none" stroke={accent} strokeWidth="0.5"
            strokeDasharray="2 8" strokeOpacity="0.3"
          />
          {/* Bright arc sweep */}
          <circle
            cx={cx} cy={cx} r={46}
            fill="none" stroke={accent} strokeWidth="2"
            strokeDasharray="15 130" strokeOpacity="0.7"
            strokeLinecap="round"
            filter="url(#jarvis-glow)"
          />
        </g>

        {/* ── Center — pulsing dot ── */}
        <circle
          cx={cx} cy={cx} r={3}
          fill={accent}
          style={{ animation: active ? 'jarvis-pulse 1.6s ease-in-out infinite' : 'none' }}
          filter="url(#jarvis-glow)"
        />

        {/* ── Crosshairs ── */}
        <line x1={cx - 10} y1={cx} x2={cx - 4} y2={cx} stroke={accent} strokeWidth="0.5" strokeOpacity="0.4" />
        <line x1={cx + 4} y1={cx} x2={cx + 10} y2={cx} stroke={accent} strokeWidth="0.5" strokeOpacity="0.4" />
        <line x1={cx} y1={cx - 10} x2={cx} y2={cx - 4} stroke={accent} strokeWidth="0.5" strokeOpacity="0.4" />
        <line x1={cx} y1={cx + 4} x2={cx} y2={cx + 10} stroke={accent} strokeWidth="0.5" strokeOpacity="0.4" />

        {/* ── Corner brackets (HUD framing) ── */}
        {/* Top-left */}
        <path d={`M ${cx - 38} ${cx - 42} L ${cx - 42} ${cx - 42} L ${cx - 42} ${cx - 38}`} fill="none" stroke={accent} strokeWidth="0.8" strokeOpacity="0.4" />
        {/* Top-right */}
        <path d={`M ${cx + 38} ${cx - 42} L ${cx + 42} ${cx - 42} L ${cx + 42} ${cx - 38}`} fill="none" stroke={accent} strokeWidth="0.8" strokeOpacity="0.4" />
        {/* Bottom-left */}
        <path d={`M ${cx - 38} ${cx + 42} L ${cx - 42} ${cx + 42} L ${cx - 42} ${cx + 38}`} fill="none" stroke={accent} strokeWidth="0.8" strokeOpacity="0.4" />
        {/* Bottom-right */}
        <path d={`M ${cx + 38} ${cx + 42} L ${cx + 42} ${cx + 42} L ${cx + 42} ${cx + 38}`} fill="none" stroke={accent} strokeWidth="0.8" strokeOpacity="0.4" />
      </svg>

      {/* Agent label — bottom center */}
      {agentLabel && active && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 7,
            letterSpacing: 3,
            color: accent,
            textTransform: 'uppercase',
            fontFamily: "'Roboto Mono', monospace",
            whiteSpace: 'nowrap',
            opacity: 0.7,
            textShadow: isCyber ? `0 0 6px ${accent}` : 'none',
            animation: 'jarvis-pulse 1.6s ease-in-out infinite',
          }}
        >
          {agentLabel}
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes jarvis-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes jarvis-spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes jarvis-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
