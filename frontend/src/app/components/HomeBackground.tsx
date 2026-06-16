/**
 * Decorative landing-page background for the Agentic Business Insight Agent.
 * Purely visual (pointer-events-none, aria-hidden) — soft glows, a faint mesh,
 * floating dashboard/chat/AI elements and thin connection lines. Tuned to stay
 * subtle in both light and dark themes and to keep the center clear for the hero.
 */
export default function HomeBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* ---- Blurred radial gradient glows (corners) ---- */}
      <div
        className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full blur-3xl opacity-60 dark:opacity-40 animate-glow"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.30), transparent 70%)" }}
      />
      <div
        className="absolute -top-32 -right-40 w-[560px] h-[560px] rounded-full blur-3xl opacity-60 dark:opacity-40 animate-glow"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.30), transparent 70%)", animationDelay: "3s" }}
      />
      <div
        className="absolute -bottom-48 -left-24 w-[560px] h-[560px] rounded-full blur-3xl opacity-50 dark:opacity-35 animate-glow"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.28), transparent 70%)", animationDelay: "1.5s" }}
      />
      <div
        className="absolute -bottom-40 -right-32 w-[520px] h-[520px] rounded-full blur-3xl opacity-50 dark:opacity-35 animate-glow"
        style={{ background: "radial-gradient(circle, rgba(6,182,212,0.22), transparent 70%)", animationDelay: "4.5s" }}
      />

      {/* ---- Mesh + floating UI / AI elements ---- */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="bg-accent" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>

          <pattern id="bg-grid" width="44" height="44" patternUnits="userSpaceOnUse">
            <path d="M44 0H0V44" fill="none" stroke="#6366f1" strokeWidth="1" strokeOpacity="0.06" />
          </pattern>

          {/* Fade the mesh out toward the center so the hero stays clean */}
          <radialGradient id="bg-fade" cx="50%" cy="42%" r="65%">
            <stop offset="0%" stopColor="black" stopOpacity="0" />
            <stop offset="55%" stopColor="black" stopOpacity="0" />
            <stop offset="100%" stopColor="black" stopOpacity="1" />
          </radialGradient>
          <mask id="bg-grid-mask">
            <rect width="1440" height="900" fill="url(#bg-fade)" />
          </mask>

          <filter id="bg-soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>

        {/* Light mesh, faded toward center */}
        <rect width="1440" height="900" fill="url(#bg-grid)" mask="url(#bg-grid-mask)" />

        {/* Thin glowing connection lines + nodes (network) */}
        <g stroke="url(#bg-accent)" strokeWidth="1.4" strokeOpacity="0.35" fill="none" filter="url(#bg-soft)">
          <polyline points="150,150 300,230 250,360 120,430" />
          <polyline points="1290,160 1160,250 1230,380 1330,470" />
          <polyline points="180,700 320,640 300,780 470,760" />
          <polyline points="1280,700 1160,650 1230,790 1080,740" />
        </g>
        <g fill="url(#bg-accent)" fillOpacity="0.55">
          {[
            [150, 150], [300, 230], [250, 360], [120, 430],
            [1290, 160], [1160, 250], [1230, 380], [1330, 470],
            [180, 700], [320, 640], [300, 780], [470, 760],
            [1280, 700], [1160, 650], [1230, 790], [1080, 740],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 4 : 2.6} />
          ))}
        </g>

        {/* ---- Floating dashboard panel: bar chart (top-left) ---- */}
        <g className="float-slow" opacity="0.5">
          <rect x="70" y="80" width="190" height="120" rx="14"
                fill="rgba(99,102,241,0.05)" stroke="#6366f1" strokeOpacity="0.2" />
          <rect x="86" y="96" width="70" height="9" rx="4" fill="#6366f1" fillOpacity="0.25" />
          <rect x="92" y="170" width="20" height="14" rx="3" fill="url(#bg-accent)" fillOpacity="0.5" />
          <rect x="120" y="150" width="20" height="34" rx="3" fill="url(#bg-accent)" fillOpacity="0.5" />
          <rect x="148" y="132" width="20" height="52" rx="3" fill="url(#bg-accent)" fillOpacity="0.5" />
          <rect x="176" y="120" width="20" height="64" rx="3" fill="url(#bg-accent)" fillOpacity="0.5" />
          <rect x="204" y="142" width="20" height="42" rx="3" fill="url(#bg-accent)" fillOpacity="0.5" />
        </g>

        {/* ---- Floating panel: line / area chart (bottom-right) ---- */}
        <g className="float-slower" opacity="0.5">
          <rect x="1150" y="630" width="210" height="130" rx="14"
                fill="rgba(59,130,246,0.05)" stroke="#3b82f6" strokeOpacity="0.2" />
          <polyline points="1168,720 1205,690 1240,705 1280,660 1320,672 1348,640"
                    fill="none" stroke="url(#bg-accent)" strokeWidth="2.5" strokeOpacity="0.6" />
          <polyline points="1168,740 1205,725 1240,735 1280,705 1320,712 1348,696"
                    fill="none" stroke="#06b6d4" strokeWidth="2" strokeOpacity="0.4" />
        </g>

        {/* ---- Donut / KPI ring (top-right) ---- */}
        <g className="float-slow" opacity="0.5">
          <circle cx="1245" cy="120" r="42" fill="none" stroke="#8b5cf6" strokeOpacity="0.15" strokeWidth="12" />
          <circle cx="1245" cy="120" r="42" fill="none" stroke="url(#bg-accent)" strokeOpacity="0.6"
                  strokeWidth="12" strokeLinecap="round" strokeDasharray="170 264" transform="rotate(-90 1245 120)" />
        </g>

        {/* ---- Chatbot conversation bubbles (bottom-left) ---- */}
        <g className="float-slower" opacity="0.55">
          <rect x="90" y="600" width="150" height="44" rx="22"
                fill="rgba(139,92,246,0.06)" stroke="#8b5cf6" strokeOpacity="0.22" />
          <circle cx="116" cy="622" r="6" fill="#8b5cf6" fillOpacity="0.4" />
          <rect x="130" y="617" width="92" height="9" rx="4" fill="#8b5cf6" fillOpacity="0.28" />
          <rect x="150" y="660" width="130" height="40" rx="20"
                fill="rgba(59,130,246,0.06)" stroke="#3b82f6" strokeOpacity="0.22" />
          <rect x="166" y="676" width="86" height="8" rx="4" fill="#3b82f6" fillOpacity="0.28" />
        </g>

        {/* ---- Document / data-flow cards (mid-left) ---- */}
        <g className="float-slow" opacity="0.45">
          <rect x="64" y="430" width="92" height="116" rx="10"
                fill="rgba(99,102,241,0.04)" stroke="#6366f1" strokeOpacity="0.2" />
          <rect x="78" y="448" width="64" height="7" rx="3" fill="#6366f1" fillOpacity="0.25" />
          <rect x="78" y="466" width="50" height="6" rx="3" fill="#6366f1" fillOpacity="0.18" />
          <rect x="78" y="482" width="60" height="6" rx="3" fill="#6366f1" fillOpacity="0.18" />
          <rect x="78" y="498" width="44" height="6" rx="3" fill="#6366f1" fillOpacity="0.18" />
        </g>
      </svg>

      <style>{`
        @keyframes bg-float-y { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-12px) } }
        @keyframes bg-glow-pulse { 0%,100% { opacity: var(--g,.55) } 50% { opacity: calc(var(--g,.55) * .7) } }
        .float-slow  { animation: bg-float-y 9s ease-in-out infinite; }
        .float-slower{ animation: bg-float-y 13s ease-in-out infinite; }
        .animate-glow{ animation: bg-glow-pulse 10s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .float-slow, .float-slower, .animate-glow { animation: none; }
        }
      `}</style>
    </div>
  );
}
