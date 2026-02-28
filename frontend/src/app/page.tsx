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

      {/* Radar animation */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg width="600" height="600" viewBox="0 0 600 600" className="opacity-[0.15]">
          {/* Concentric circles */}
          <circle cx="300" cy="300" r="100" fill="none" stroke="white" strokeWidth="0.5" />
          <circle cx="300" cy="300" r="200" fill="none" stroke="white" strokeWidth="0.5" />
          <circle cx="300" cy="300" r="295" fill="none" stroke="white" strokeWidth="0.5" />

          {/* Center crosshair */}
          <line x1="300" y1="5" x2="300" y2="595" stroke="white" strokeWidth="0.5" />
          <line x1="5" y1="300" x2="595" y2="300" stroke="white" strokeWidth="0.5" />

          {/* Radar sweep */}
          <g className="radar-sweep">
            <defs>
              <linearGradient id="sweep" gradientTransform="rotate(0, 0.5, 0.5)">
                <stop offset="0%" stopColor="white" stopOpacity="0" />
                <stop offset="100%" stopColor="white" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            <path
              d="M300,300 L300,5 A295,295 0 0,1 508.7,153.5 Z"
              fill="url(#sweep)"
            />
          </g>

          {/* Pings */}
          <circle cx="220" cy="200" r="4" fill="white" className="radar-ping" />
          <circle cx="380" cy="350" r="3" fill="white" className="radar-ping-delayed" />
          <circle cx="340" cy="180" r="3" fill="white" className="radar-ping" />
          <circle cx="250" cy="380" r="4" fill="white" className="radar-ping-delayed" />
        </svg>
      </div>

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
        <div className="flex gap-4 justify-center">
          <Link
            href="/chat"
            className="inline-block border border-white/20 px-8 py-3 text-sm uppercase tracking-widest transition-all duration-300 hover:bg-white hover:text-black"
          >
            Launch briefing
          </Link>
          <Link
            href="/about"
            className="inline-block border border-white/10 px-8 py-3 text-sm uppercase tracking-widest transition-all duration-300 hover:border-white/30"
            style={{ color: "var(--muted)" }}
          >
            Architecture
          </Link>
        </div>

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
