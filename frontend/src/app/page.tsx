import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 text-center">
        {/* Logo */}
        <h1
          className="text-8xl font-bold tracking-tighter mb-2"
          style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.06em" }}
        >
          Omni<span className="font-light">CAT</span>
        </h1>

        <p
          className="text-sm uppercase tracking-[0.3em] mb-16"
          style={{ color: "var(--muted)" }}
        >
          Multi-Agent OSINT Intelligence
        </p>

        {/* CTA */}
        <Link
          href="/chat"
          className="inline-block border border-white/20 px-8 py-3 text-sm uppercase tracking-widest transition-all duration-300 hover:bg-white hover:text-black"
        >
          Lancer un briefing
        </Link>

        {/* Data sources */}
        <div
          className="mt-20 text-xs uppercase tracking-widest flex gap-6 justify-center flex-wrap"
          style={{ color: "var(--muted)" }}
        >
          <span>AIS Stream</span>
          <span>OpenSky</span>
          <span>NASA EONET</span>
          <span>USGS</span>
          <span>ACLED</span>
          <span>GDELT</span>
        </div>
      </div>
    </div>
  );
}
