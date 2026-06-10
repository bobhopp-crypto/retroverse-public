"use client";

import type { VisualWorld } from "@/lib/ops/creative-lab/visual-worlds";

type Props = {
  world: VisualWorld;
};

/** Decorative hero preview per visual world — not a pass mockup. */
export function VisualWorldHero({ world }: Props) {
  const { palette, id } = world;
  const [c1, c2, c3, c4, c5] = palette;

  if (id === "psychedelic-festival") {
    return (
      <svg viewBox="0 0 200 280" className="cl-world-hero" aria-hidden>
        <defs>
          <radialGradient id="psy-sun" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor={c2} />
            <stop offset="100%" stopColor={c4} />
          </radialGradient>
        </defs>
        <rect width="200" height="280" fill={c5} />
        <circle cx="100" cy="120" r="70" fill="url(#psy-sun)" />
        {[...Array(12)].map((_, i) => (
          <line
            key={i}
            x1="100"
            y1="120"
            x2={100 + Math.cos((i * Math.PI) / 6) * 90}
            y2={120 + Math.sin((i * Math.PI) / 6) * 90}
            stroke={c1}
            strokeWidth="3"
          />
        ))}
        <rect x="12" y="12" width="176" height="256" fill="none" stroke={c3} strokeWidth="4" rx="8" />
      </svg>
    );
  }

  if (id === "saturday-morning-cartoon") {
    return (
      <svg viewBox="0 0 200 280" className="cl-world-hero" aria-hidden>
        <rect width="200" height="280" fill={c5} />
        <rect x="20" y="60" width="160" height="160" fill={c2} stroke={c4} strokeWidth="6" rx="16" />
        <circle cx="80" cy="130" r="18" fill={c1} stroke={c4} strokeWidth="4" />
        <circle cx="120" cy="130" r="18" fill={c3} stroke={c4} strokeWidth="4" />
        <path d="M70 170 Q100 200 130 170" fill="none" stroke={c4} strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  }

  if (id === "vintage-television") {
    return (
      <svg viewBox="0 0 200 280" className="cl-world-hero" aria-hidden>
        <rect width="200" height="280" fill={c1} />
        <rect x="30" y="50" width="140" height="110" fill={c3} stroke={c2} strokeWidth="5" rx="6" />
        <rect x="50" y="180" width="100" height="60" fill={c4} rx="4" />
        <circle cx="165" cy="65" r="8" fill={c4} />
        <text x="100" y="215" textAnchor="middle" fill={c2} fontSize="14" fontWeight="bold">
          ON AIR
        </text>
      </svg>
    );
  }

  if (id === "collector-memorabilia") {
    return (
      <svg viewBox="0 0 200 280" className="cl-world-hero" aria-hidden>
        <rect width="200" height="280" fill={c3} />
        <rect x="25" y="40" width="150" height="200" fill={c1} stroke={c5} strokeWidth="3" rx="4" />
        <rect x="35" y="50" width="130" height="100" fill={c3} stroke={c2} strokeWidth="2" />
        <text x="100" y="200" textAnchor="middle" fill={c4} fontSize="12" fontFamily="serif">
          № 001 / 250
        </text>
        <polygon points="160,40 175,55 160,70" fill={c5} />
      </svg>
    );
  }

  if (id === "rock-poster") {
    return (
      <svg viewBox="0 0 200 280" className="cl-world-hero" aria-hidden>
        <rect width="200" height="280" fill={c5} />
        <rect x="15" y="15" width="170" height="250" fill="none" stroke={c1} strokeWidth="5" />
        <rect x="40" y="80" width="120" height="120" fill={c3} />
        <text x="100" y="55" textAnchor="middle" fill={c1} fontSize="18" fontWeight="900">
          LIVE
        </text>
        <text x="100" y="240" textAnchor="middle" fill={c2} fontSize="14" fontWeight="bold">
          TONIGHT
        </text>
      </svg>
    );
  }

  // retro-disney-adventure
  return (
    <svg viewBox="0 0 200 280" className="cl-world-hero" aria-hidden>
      <rect width="200" height="280" fill={c5} />
      <path d="M20 40 Q100 10 180 40 L180 240 Q100 270 20 240 Z" fill={c1} opacity="0.25" />
      <circle cx="100" cy="130" r="50" fill={c2} stroke={c4} strokeWidth="3" />
      <path d="M85 130 L95 145 L115 115" fill="none" stroke={c4} strokeWidth="4" strokeLinecap="round" />
      {[...Array(5)].map((_, i) => (
        <circle key={i} cx={40 + i * 30} cy={50 + (i % 2) * 10} r="4" fill={c2} />
      ))}
    </svg>
  );
}
