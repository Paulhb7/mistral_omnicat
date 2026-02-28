import Link from "next/link";

const mono = "'Roboto Mono', monospace";
const sans = "'Plus Jakarta Sans', system-ui, sans-serif";

const agents = [
  { icon: "🚢", name: "Maritime", description: "Real-time vessel tracking, port traffic and AIS/MMSI data.", sources: ["AIS Stream"] },
  { icon: "✈️", name: "Aviation", description: "Flight tracking, air traffic and aircraft identification via ICAO.", sources: ["OpenSky Network"] },
  { icon: "💀", name: "Doomsday", description: "Natural hazards: earthquakes, climate events, volcanoes, floods, wildfires.", sources: ["NASA EONET", "USGS"] },
  { icon: "⚔️", name: "Conflict", description: "Armed conflicts, geopolitics, protests and media monitoring.", sources: ["ACLED", "GDELT"] },
  { icon: "☀️", name: "Solar System", description: "Solar flares, near-Earth objects (NEO) and space weather.", sources: ["NASA DONKI", "NASA NeoWs"] },
];

const sharedTools = [
  { name: "Geocoding", desc: "Location → GPS coordinates via Nominatim" },
  { name: "Weather", desc: "Real-time conditions via Open-Meteo" },
];

const SOURCES = [
  { name: "Mistral AI", desc: "LLM orchestrator & specialist agents" },
  { name: "AIS Stream", desc: "Real-time vessel tracking — AIS data" },
  { name: "OpenSky Network", desc: "Live flight tracking — ICAO transponders" },
  { name: "NASA EONET", desc: "Natural event tracker — fires, storms, floods" },
  { name: "USGS", desc: "Earthquake feed — magnitude, depth, location" },
  { name: "ACLED", desc: "Armed conflict data — events & fatalities" },
  { name: "GDELT", desc: "Global news intelligence — articles, sentiment" },
  { name: "NASA DONKI", desc: "Space weather — solar flares, class & timing" },
  { name: "NASA NeoWs", desc: "Near-Earth objects — distance, velocity, hazard" },
  { name: "Nominatim", desc: "Geocoding — place name to coordinates" },
  { name: "Open-Meteo", desc: "Open weather API — temp, wind, humidity" },
];

function Nav() {
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 80,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 40px", height: 56,
      background: "#111113",
      borderBottom: "1px solid rgba(255,250,235,0.08)",
      fontFamily: mono,
    }}>
      <Link href="/" style={{ fontSize: 12, fontWeight: 600, letterSpacing: 4, color: "#fa500f", textDecoration: "none" }}>
        Omni<strong>CAT</strong>
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        <Link href="/" style={{ fontSize: 11, letterSpacing: 2, color: "rgba(255,250,235,0.4)", textDecoration: "none", textTransform: "uppercase" }}>
          Home
        </Link>
        <Link href="/about" style={{ fontSize: 11, letterSpacing: 2, color: "#fffaeb", textDecoration: "none", textTransform: "uppercase", borderBottom: "1px solid rgba(250,80,15,0.5)", paddingBottom: 2 }}>
          About
        </Link>
        <Link href="/chat" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "7px 18px",
          background: "#fa500f", color: "#111113",
          fontSize: 11, fontWeight: 700, letterSpacing: 2,
          textDecoration: "none", textTransform: "uppercase",
        }}>
          Launch →
        </Link>
      </div>
    </nav>
  );
}

export default function AboutPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#111113", color: "#fffaeb", fontFamily: sans, position: "relative", overflow: "hidden" }}>
      {/* Noise texture */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
        }}
      />

      {/* Orange glow — top right */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 50% 35% at 85% 0%, rgba(250,80,15,0.10) 0%, transparent 60%)",
        }}
      />

      {/* Floating scan line */}
      <div
        aria-hidden
        style={{
          position: "fixed", left: 0, right: 0, height: 1, zIndex: 0,
          pointerEvents: "none",
          background: "linear-gradient(90deg, transparent 0%, rgba(250,80,15,0.15) 50%, transparent 100%)",
          animation: "scanline 8s linear infinite",
        }}
      />

      {/* Grid dots background */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.4,
          backgroundImage: "radial-gradient(rgba(250,80,15,0.15) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <style>{`
        @keyframes scanline {
          0% { top: -2%; }
          100% { top: 102%; }
        }
      `}</style>

      <Nav />

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "96px 32px 80px", position: "relative", zIndex: 10 }}>

        {/* Header */}
        <div style={{ marginBottom: 64 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "4px 12px", marginBottom: 24,
            border: "1px solid rgba(250,80,15,0.3)",
            background: "rgba(250,80,15,0.06)",
            fontSize: 10, letterSpacing: 3,
            color: "#fa500f", fontFamily: mono,
            textTransform: "uppercase",
          }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#fa500f", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
            Architecture
          </div>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 20 }}>
            How it works
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,250,235,0.5)", lineHeight: 1.8, maxWidth: 640 }}>
            OmniCAT combines a Mistral AI agentic loop with real-time data APIs.
            When you enter a location, the orchestrator automatically selects and calls
            the relevant agents in parallel, then synthesises the results into a structured intelligence brief.
          </p>
        </div>

        {/* Flow summary */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 1, marginBottom: 64,
          border: "1px solid rgba(255,250,235,0.08)",
          background: "rgba(255,250,235,0.08)",
        }}>
          {[
            { step: "01", label: "Query", desc: "User types a location or area of interest" },
            { step: "02", label: "Routing", desc: "LLM orchestrator selects the relevant specialist agents" },
            { step: "03", label: "Tools", desc: "Agents call live APIs: AIS, OpenSky, NASA, ACLED, GDELT…" },
            { step: "04", label: "Stream", desc: "Structured OSINT briefing streamed in real-time via SSE" },
          ].map(({ step, label, desc }) => (
            <div key={step} style={{ padding: "20px 24px", background: "#111113" }}>
              <div style={{ fontSize: 9, letterSpacing: 3, color: "#fa500f", fontFamily: mono, marginBottom: 8 }}>{step}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 12, color: "rgba(255,250,235,0.4)", lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* Agents */}
        <div style={{ marginBottom: 64 }}>
          <div style={{
            fontSize: 8, letterSpacing: 4, color: "rgba(255,250,235,0.35)",
            fontFamily: mono, textTransform: "uppercase", marginBottom: 20,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            Specialized agents
            <div style={{ flex: 1, height: 1, background: "rgba(255,250,235,0.08)" }} />
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 1,
            border: "1px solid rgba(255,250,235,0.08)",
            background: "rgba(255,250,235,0.08)",
          }}>
            {agents.map((agent) => (
              <div key={agent.name} style={{ padding: "20px 24px", background: "#111113" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>{agent.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: 1 }}>{agent.name}</span>
                </div>
                <p style={{ fontSize: 12, color: "rgba(255,250,235,0.4)", lineHeight: 1.6, marginBottom: 12 }}>
                  {agent.description}
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {agent.sources.map((src) => (
                    <span key={src} style={{
                      fontSize: 10, letterSpacing: 1, padding: "2px 8px",
                      border: "1px solid rgba(250,80,15,0.2)",
                      color: "#fa500f", fontFamily: mono,
                      textTransform: "uppercase",
                    }}>
                      {src}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shared tools */}
        <div style={{ marginBottom: 64 }}>
          <div style={{
            fontSize: 8, letterSpacing: 4, color: "rgba(255,250,235,0.35)",
            fontFamily: mono, textTransform: "uppercase", marginBottom: 20,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            Shared tools
            <div style={{ flex: 1, height: 1, background: "rgba(255,250,235,0.08)" }} />
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1,
            border: "1px solid rgba(255,250,235,0.08)",
            background: "rgba(255,250,235,0.08)",
          }}>
            {sharedTools.map((tool) => (
              <div key={tool.name} style={{ padding: "16px 24px", background: "#111113" }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: "#fa500f", fontFamily: mono, marginBottom: 4 }}>
                  {tool.name}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,250,235,0.4)" }}>{tool.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Data sources */}
        <div style={{ marginBottom: 64 }}>
          <div style={{
            fontSize: 8, letterSpacing: 4, color: "rgba(255,250,235,0.35)",
            fontFamily: mono, textTransform: "uppercase", marginBottom: 20,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            Data sources
            <div style={{ flex: 1, height: 1, background: "rgba(255,250,235,0.08)" }} />
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 1,
            border: "1px solid rgba(255,250,235,0.08)",
            background: "rgba(255,250,235,0.08)",
          }}>
            {SOURCES.map(({ name, desc }) => (
              <div key={name} style={{ padding: "16px 20px", background: "#111113", transition: "background 0.15s" }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: "#fa500f", fontFamily: mono, marginBottom: 6 }}>
                  {name}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,250,235,0.4)", lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech stack */}
        <div style={{ marginBottom: 64 }}>
          <div style={{
            fontSize: 8, letterSpacing: 4, color: "rgba(255,250,235,0.35)",
            fontFamily: mono, textTransform: "uppercase", marginBottom: 20,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            Tech stack
            <div style={{ flex: 1, height: 1, background: "rgba(255,250,235,0.08)" }} />
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1,
            border: "1px solid rgba(255,250,235,0.08)",
            background: "rgba(255,250,235,0.08)",
          }}>
            {[
              { label: "LLM", value: "Mistral via AWS Bedrock" },
              { label: "Agent framework", value: "Strands Agents" },
              { label: "Backend", value: "FastAPI + SSE streaming" },
              { label: "Frontend", value: "Next.js 15 + Tailwind 4" },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: "16px 24px", background: "#111113" }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: "#fffaeb", fontFamily: mono, marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,250,235,0.4)" }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <div style={{ textAlign: "center" }}>
          <Link href="/chat" style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "14px 32px",
            background: "#fa500f", color: "#111113",
            fontWeight: 700, fontSize: 14, letterSpacing: "0.02em",
            textDecoration: "none", fontFamily: sans,
            transition: "opacity 0.15s",
          }}>
            Launch briefing
            <span style={{ fontFamily: mono, fontSize: 16 }}>→</span>
          </Link>
        </div>

      </main>
    </div>
  );
}
