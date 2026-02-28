"use client";

import Link from "next/link";
import OrangeGlobe from "@/components/orange-globe";
import { useTheme } from "@/context/theme-context";

export default function Home() {
  const { theme, themeKey, toggle: toggleTheme } = useTheme();
  const isCyber = themeKey === "cyberpunk";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.fg,
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        transition: "background 0.5s ease, color 0.5s ease",
      }}
    >
      {/* Subtle noise texture */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
        }}
      />

      {/* Accent glow — top left */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse 60% 40% at 10% 0%, ${theme.glow} 0%, transparent 60%)`,
        }}
      />

      {/* Cyberpunk: secondary glow — bottom right */}
      {isCyber && (
        <div
          aria-hidden
          style={{
            position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
            background: `radial-gradient(ellipse 50% 40% at 90% 100%, rgba(255,0,170,0.08) 0%, transparent 60%)`,
          }}
        />
      )}

      {/* Wireframe globe — decorative, right side */}
      <div aria-hidden style={{
        position: "fixed", zIndex: 1, pointerEvents: "none",
        right: "-5vw", top: "50%", transform: "translateY(-50%)",
      }}>
        <OrangeGlobe size={680} opacity={0.22} />
      </div>

      {/* ── Nav ── */}
      <nav
        style={{
          position: "relative", zIndex: 10,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 40px",
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <span
          style={{
            fontFamily: "'Roboto Mono', monospace",
            fontSize: 13, fontWeight: 500, letterSpacing: 4,
            color: theme.accent,
            animation: isCyber ? "neon-flicker 4s ease-in-out infinite" : "none",
            textShadow: isCyber ? `0 0 8px ${theme.accent}` : "none",
          }}
        >
          Omni<strong>CAT</strong>
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: "'Roboto Mono', monospace" }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title="Toggle Cyberpunk mode (Ctrl+Shift+X)"
            style={{
              background: isCyber ? theme.accentDim : "transparent",
              border: `1px solid ${isCyber ? theme.accentBorder : theme.border}`,
              color: isCyber ? theme.accent : theme.fgDim,
              fontFamily: "'Roboto Mono', monospace", fontSize: 9, letterSpacing: 2,
              padding: "4px 10px", cursor: "pointer", textTransform: "uppercase",
              transition: "all 0.3s ease",
              boxShadow: isCyber ? `0 0 8px ${theme.accentDim}, inset 0 0 8px ${theme.accentDim}` : "none",
              textShadow: isCyber ? `0 0 4px ${theme.accent}` : "none",
            }}
          >
            {isCyber ? "\u25c8 CYBER" : "\u25cb CYBER"}
          </button>
          <Link href="/about" style={{ fontSize: 11, letterSpacing: 2, color: theme.fgDim, textDecoration: "none", textTransform: "uppercase" }}>
            About
          </Link>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, letterSpacing: 2, color: theme.fgMuted, textTransform: "uppercase" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: theme.accent, display: "inline-block", animation: "pulse 2s ease-in-out infinite", boxShadow: isCyber ? `0 0 6px ${theme.accent}` : "none" }} />
            Hackathon Mistral {"\u00b7"} 2026
          </span>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        style={{
          position: "relative", zIndex: 10,
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 14px", marginBottom: 40,
            border: `1px solid ${theme.accentBorder}`,
            background: theme.accentDim,
            fontSize: 11, letterSpacing: 2,
            color: theme.accent,
            fontFamily: "'Roboto Mono', monospace",
            textTransform: "uppercase",
            textShadow: isCyber ? `0 0 4px ${theme.accent}` : "none",
          }}
        >
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: theme.accent, display: "inline-block" }} />
          Collect {"\u00b7"} Analyse {"\u00b7"} Prevent
        </div>

        {/* Radar — centered behind heading */}
        <div style={{ position: "absolute", zIndex: 0, pointerEvents: "none", opacity: 0.28 }}>
          <svg width="500" height="500" viewBox="0 0 600 600">
            <circle cx="300" cy="300" r="100" fill="none" stroke={theme.accent} strokeWidth="0.5" />
            <circle cx="300" cy="300" r="200" fill="none" stroke={theme.accent} strokeWidth="0.5" />
            <circle cx="300" cy="300" r="295" fill="none" stroke={theme.accent} strokeWidth="0.5" />
            <line x1="300" y1="5" x2="300" y2="595" stroke={theme.accent} strokeWidth="0.5" />
            <line x1="5" y1="300" x2="595" y2="300" stroke={theme.accent} strokeWidth="0.5" />
            <g className="radar-sweep">
              <defs>
                <linearGradient id="sweep" gradientTransform="rotate(0, 0.5, 0.5)">
                  <stop offset="0%" stopColor={theme.accent} stopOpacity="0" />
                  <stop offset="100%" stopColor={theme.accent} stopOpacity="0.6" />
                </linearGradient>
              </defs>
              <path
                d="M300,300 L300,5 A295,295 0 0,1 508.7,153.5 Z"
                fill="url(#sweep)"
              />
            </g>
            <circle cx="220" cy="200" r="4" fill={theme.accent} className="radar-ping" />
            <circle cx="380" cy="350" r="3" fill={theme.accent} className="radar-ping-delayed" />
            <circle cx="340" cy="180" r="3" fill={theme.accent} className="radar-ping" />
            <circle cx="250" cy="380" r="4" fill={theme.accent} className="radar-ping-delayed" />
          </svg>
        </div>

        {/* Heading */}
        <h1
          style={{
            position: "relative", zIndex: 1,
            fontSize: isCyber ? "clamp(60px, 10vw, 120px)" : "clamp(52px, 9vw, 104px)",
            fontWeight: isCyber ? 800 : 700,
            lineHeight: 1.0,
            letterSpacing: isCyber ? "-0.02em" : "-0.04em",
            marginBottom: 28,
            color: theme.fg,
            textShadow: isCyber ? `0 0 30px rgba(0, 240, 255, 0.3)` : "none",
          }}
        >
          Omni<span style={{ color: theme.accent, textShadow: isCyber ? `0 0 20px ${theme.accent}, 0 0 50px ${theme.accent}, 0 0 100px ${theme.accent}` : "none", animation: isCyber ? "neon-breathe 3s ease-in-out infinite" : "none" }}>CAT</span>
        </h1>

        {/* Description */}
        <p
          style={{
            position: "relative", zIndex: 1,
            fontSize: "clamp(16px, 2vw, 20px)",
            color: theme.fgDim,
            maxWidth: 500,
            lineHeight: 1.6,
            marginBottom: 14,
            fontFamily: "'Roboto Mono', monospace",
            letterSpacing: "0.02em",
            fontStyle: "italic",
          }}
        >
          The secret son of Jarvis, Palantir and Mistral.
        </p>

        <p
          style={{
            position: "relative", zIndex: 1,
            fontSize: isCyber ? "clamp(14px, 1.6vw, 17px)" : "clamp(13px, 1.4vw, 15px)",
            color: isCyber ? theme.fgDim : theme.fgMuted,
            maxWidth: 500,
            lineHeight: 1.7,
            marginBottom: 52,
            fontWeight: 400,
          }}
        >
          Real-time geospatial intelligence — maritime, aviation, seismic,
          conflicts and space weather — powered by Mistral AI.
        </p>

        {/* CTA */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 16 }}>
          <Link
            href="/chat"
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "14px 32px",
              background: theme.accent,
              color: theme.bg,
              fontWeight: 700, fontSize: 14,
              letterSpacing: "0.02em",
              textDecoration: "none",
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              transition: "opacity 0.15s, box-shadow 0.3s ease",
              boxShadow: isCyber ? `0 0 20px ${theme.accent}, 0 0 40px ${theme.accentDim}, 0 0 80px ${theme.accentDim}` : "none",
            }}
            className="hover:opacity-80"
          >
            Launch briefing
            <span style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 16 }}>{"\u2192"}</span>
          </Link>
          <Link
            href="/about"
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "14px 32px",
              background: "transparent",
              color: theme.fgDim,
              fontWeight: 500, fontSize: 14,
              letterSpacing: "0.02em",
              textDecoration: "none",
              border: `1px solid ${theme.border}`,
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              transition: "all 0.15s",
            }}
          >
            Architecture
          </Link>
        </div>
      </section>

      {/* ── Data sources strip ── */}
      <footer
        style={{
          position: "relative", zIndex: 10,
          borderTop: `1px solid ${theme.border}`,
          padding: "20px 40px",
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 32, flexWrap: "wrap",
        }}
      >
        {["Mistral AI", "AIS Stream", "OpenSky", "NASA EONET", "USGS", "ACLED", "GDELT"].map(src => (
          <span
            key={src}
            className="source-tag"
            style={{
              fontSize: 10, letterSpacing: 2,
              color: theme.fgMuted,
              fontFamily: "'Roboto Mono', monospace",
              textTransform: "uppercase",
              padding: "4px 10px",
              transition: "all 0.2s",
              cursor: "default",
            }}
          >
            {src}
          </span>
        ))}
        <style>{`
          .source-tag:hover {
            color: ${theme.accent} !important;
            background: ${theme.accentDim};
            border: 1px solid ${theme.accentBorder};
            margin: -1px;
          }
        `}</style>
      </footer>
    </main>
  );
}
