"use client";

import Link from "next/link";
import OrangeGlobe from "@/components/orange-globe";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#111113",
        color: "#fffaeb",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
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

      {/* Orange glow — top left */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 60% 40% at 10% 0%, rgba(250,80,15,0.12) 0%, transparent 60%)",
        }}
      />

      {/* Orange wireframe globe — decorative, right side */}
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
          borderBottom: "1px solid rgba(255,250,235,0.06)",
        }}
      >
        <span
          style={{
            fontFamily: "'Roboto Mono', monospace",
            fontSize: 13, fontWeight: 500, letterSpacing: 4,
            color: "#fa500f",
          }}
        >
          Omni<strong>CAT</strong>
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 32, fontFamily: "'Roboto Mono', monospace" }}>
          <Link href="/about" style={{ fontSize: 11, letterSpacing: 2, color: "rgba(255,250,235,0.4)", textDecoration: "none", textTransform: "uppercase" }}>
            About
          </Link>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, letterSpacing: 2, color: "rgba(255,250,235,0.25)", textTransform: "uppercase" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fa500f", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
            Hackathon Mistral · 2026
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
            border: "1px solid rgba(250,80,15,0.3)",
            background: "rgba(250,80,15,0.06)",
            fontSize: 11, letterSpacing: 2,
            color: "#fa500f",
            fontFamily: "'Roboto Mono', monospace",
            textTransform: "uppercase",
          }}
        >
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#fa500f", display: "inline-block" }} />
          Collect · Analyse · Prevent
        </div>

        {/* Radar — centered behind heading */}
        <div style={{ position: "absolute", zIndex: 0, pointerEvents: "none", opacity: 0.1 }}>
          <svg width="500" height="500" viewBox="0 0 600 600">
            <circle cx="300" cy="300" r="100" fill="none" stroke="#fa500f" strokeWidth="0.5" />
            <circle cx="300" cy="300" r="200" fill="none" stroke="#fa500f" strokeWidth="0.5" />
            <circle cx="300" cy="300" r="295" fill="none" stroke="#fa500f" strokeWidth="0.5" />
            <line x1="300" y1="5" x2="300" y2="595" stroke="#fa500f" strokeWidth="0.5" />
            <line x1="5" y1="300" x2="595" y2="300" stroke="#fa500f" strokeWidth="0.5" />
            <g className="radar-sweep">
              <defs>
                <linearGradient id="sweep" gradientTransform="rotate(0, 0.5, 0.5)">
                  <stop offset="0%" stopColor="#fa500f" stopOpacity="0" />
                  <stop offset="100%" stopColor="#fa500f" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              <path
                d="M300,300 L300,5 A295,295 0 0,1 508.7,153.5 Z"
                fill="url(#sweep)"
              />
            </g>
            <circle cx="220" cy="200" r="4" fill="#fa500f" className="radar-ping" />
            <circle cx="380" cy="350" r="3" fill="#fa500f" className="radar-ping-delayed" />
            <circle cx="340" cy="180" r="3" fill="#fa500f" className="radar-ping" />
            <circle cx="250" cy="380" r="4" fill="#fa500f" className="radar-ping-delayed" />
          </svg>
        </div>

        {/* Heading */}
        <h1
          style={{
            position: "relative", zIndex: 1,
            fontSize: "clamp(52px, 9vw, 104px)",
            fontWeight: 700,
            lineHeight: 1.0,
            letterSpacing: "-0.04em",
            marginBottom: 28,
            color: "#fffaeb",
          }}
        >
          Omni<span style={{ color: "#fa500f" }}>CAT</span>
        </h1>

        {/* Description */}
        <p
          style={{
            position: "relative", zIndex: 1,
            fontSize: "clamp(16px, 2vw, 20px)",
            color: "rgba(255,250,235,0.5)",
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
            fontSize: "clamp(13px, 1.4vw, 15px)",
            color: "rgba(255,250,235,0.35)",
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
              background: "#fa500f",
              color: "#111113",
              fontWeight: 700, fontSize: 14,
              letterSpacing: "0.02em",
              textDecoration: "none",
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              transition: "opacity 0.15s",
            }}
            className="hover:opacity-80"
          >
            Launch briefing
            <span style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 16 }}>→</span>
          </Link>
          <Link
            href="/about"
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "14px 32px",
              background: "transparent",
              color: "rgba(255,250,235,0.45)",
              fontWeight: 500, fontSize: 14,
              letterSpacing: "0.02em",
              textDecoration: "none",
              border: "1px solid rgba(255,250,235,0.12)",
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              transition: "all 0.15s",
            }}
            className="hover:border-[rgba(255,250,235,0.3)] hover:text-[#fffaeb]"
          >
            Architecture
          </Link>
        </div>
      </section>

      {/* ── Data sources strip ── */}
      <footer
        style={{
          position: "relative", zIndex: 10,
          borderTop: "1px solid rgba(255,250,235,0.06)",
          padding: "20px 40px",
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 32, flexWrap: "wrap",
        }}
      >
        {["Mistral AI", "AIS Stream", "OpenSky", "NASA EONET", "USGS", "ACLED", "GDELT"].map(src => (
          <span
            key={src}
            style={{
              fontSize: 10, letterSpacing: 2,
              color: "rgba(255,250,235,0.18)",
              fontFamily: "'Roboto Mono', monospace",
              textTransform: "uppercase",
            }}
          >
            {src}
          </span>
        ))}
      </footer>
    </main>
  );
}
