import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const agents = [
  {
    icon: "🚢",
    name: "Maritime",
    description:
      "Suivi de navires en temps réel, trafic portuaire et données AIS/MMSI.",
    sources: ["AIS Stream"],
  },
  {
    icon: "✈️",
    name: "Aviation",
    description:
      "Suivi de vols, trafic aérien et identification d'aéronefs via ICAO.",
    sources: ["OpenSky Network"],
  },
  {
    icon: "💀",
    name: "Doomsday",
    description:
      "Risques naturels : séismes, événements climatiques, volcans, inondations, feux.",
    sources: ["NASA EONET", "USGS"],
  },
  {
    icon: "⚔️",
    name: "Conflict",
    description:
      "Conflits armés, géopolitique, manifestations et veille médiatique.",
    sources: ["ACLED", "GDELT"],
  },
  {
    icon: "☀️",
    name: "Solar System",
    description:
      "Éruptions solaires, astéroïdes proches (NEO) et météo spatiale.",
    sources: ["NASA DONKI", "NASA NeoWs"],
  },
];

const sharedTools = [
  { name: "Geocoding", description: "Résolution de noms de lieux en coordonnées GPS" },
  { name: "Météo", description: "Conditions météorologiques en temps réel" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm mb-12 transition-opacity hover:opacity-60"
          style={{ color: "var(--muted)" }}
        >
          <ArrowLeft size={14} />
          Retour
        </Link>

        <h1
          className="text-5xl font-bold tracking-tighter mb-2"
          style={{ letterSpacing: "-0.04em" }}
        >
          Architecture
        </h1>
        <p
          className="text-sm uppercase tracking-[0.3em] mb-16"
          style={{ color: "var(--muted)" }}
        >
          Comment fonctionne OmniCAT
        </p>

        {/* Orchestrator */}
        <section className="mb-16">
          <h2 className="text-xs uppercase tracking-widest mb-6" style={{ color: "var(--muted)" }}>
            Orchestrateur
          </h2>
          <div
            className="border p-6 rounded-none"
            style={{ borderColor: "var(--border)", background: "var(--card)" }}
          >
            <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              Le <span className="text-white font-medium">routeur LLM</span> analyse chaque requête
              et décide quel(s) agent(s) spécialisé(s) mobiliser. Les agents sélectionnés sont
              lancés <span className="text-white font-medium">en parallèle</span>, puis leurs
              résultats sont assemblés en un briefing structuré.
            </p>

            {/* Flow diagram */}
            <div className="mt-8 flex flex-col items-center gap-3">
              <div
                className="border px-4 py-2 text-xs uppercase tracking-widest"
                style={{ borderColor: "var(--border)" }}
              >
                Requête utilisateur
              </div>
              <div className="w-px h-6" style={{ background: "var(--border)" }} />
              <div
                className="border px-4 py-2 text-xs uppercase tracking-widest text-white"
                style={{ borderColor: "rgba(255,255,255,0.3)" }}
              >
                Orchestrateur — Routing LLM
              </div>
              <div className="flex items-start gap-8 mt-2">
                {agents.map((a) => (
                  <div key={a.name} className="flex flex-col items-center gap-2">
                    <div className="w-px h-6" style={{ background: "var(--border)" }} />
                    <span className="text-lg">{a.icon}</span>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      {a.name}
                    </span>
                  </div>
                ))}
              </div>
              <div className="w-px h-6 mt-2" style={{ background: "var(--border)" }} />
              <div
                className="border px-4 py-2 text-xs uppercase tracking-widest"
                style={{ borderColor: "var(--border)" }}
              >
                Briefing OSINT
              </div>
            </div>
          </div>
        </section>

        {/* Agents */}
        <section className="mb-16">
          <h2 className="text-xs uppercase tracking-widest mb-6" style={{ color: "var(--muted)" }}>
            Agents spécialisés
          </h2>
          <div className="flex flex-col gap-4">
            {agents.map((agent) => (
              <div
                key={agent.name}
                className="border p-6 rounded-none"
                style={{ borderColor: "var(--border)", background: "var(--card)" }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{agent.icon}</span>
                  <h3 className="text-lg font-semibold tracking-tight">{agent.name}</h3>
                </div>
                <p className="text-sm mb-4 leading-relaxed" style={{ color: "var(--muted)" }}>
                  {agent.description}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {agent.sources.map((src) => (
                    <span
                      key={src}
                      className="text-xs px-2 py-1 border"
                      style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                    >
                      {src}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Shared tools */}
        <section className="mb-16">
          <h2 className="text-xs uppercase tracking-widest mb-6" style={{ color: "var(--muted)" }}>
            Outils partagés
          </h2>
          <div className="flex flex-col gap-4">
            {sharedTools.map((tool) => (
              <div
                key={tool.name}
                className="border p-4 rounded-none flex items-center justify-between"
                style={{ borderColor: "var(--border)", background: "var(--card)" }}
              >
                <span className="text-sm font-medium">{tool.name}</span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  {tool.description}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Tech stack */}
        <section>
          <h2 className="text-xs uppercase tracking-widest mb-6" style={{ color: "var(--muted)" }}>
            Stack technique
          </h2>
          <div
            className="border p-6 rounded-none text-sm leading-relaxed"
            style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--muted)" }}
          >
            <div className="grid grid-cols-2 gap-y-3 gap-x-8">
              <span className="text-white">LLM</span>
              <span>Mistral via AWS Bedrock</span>
              <span className="text-white">Framework agents</span>
              <span>Strands Agents</span>
              <span className="text-white">Backend</span>
              <span>FastAPI + SSE streaming</span>
              <span className="text-white">Frontend</span>
              <span>Next.js 15 + Tailwind</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
