"use client";

import type { PassMockupSpec } from "@/lib/ops/creative-lab/pass-mockup";

type Props = {
  spec: PassMockupSpec;
};

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function BroadcastPass({ spec, vertical }: { spec: PassMockupSpec; vertical?: boolean }) {
  const [bg, accent, ink, dark] = spec.palette;
  const w = vertical ? 215 : 340;
  const h = vertical ? 340 : 215;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="cl-pass-mock__svg" role="img" aria-label={`${spec.strategyLabel} pass mockup`}>
      <rect width={w} height={h} fill={bg} rx={8} />
      <rect x={0} y={0} width={w} height={vertical ? 48 : 36} fill={dark} rx={8} />
      <rect x={0} y={vertical ? 40 : 28} width={w} height={8} fill={accent} />
      <circle cx={vertical ? 28 : 24} cy={vertical ? 24 : 18} r={10} fill="#e53935" />
      <text x={vertical ? 44 : 40} y={vertical ? 28 : 22} fill="#fff" fontSize={vertical ? 11 : 10} fontWeight={800}>
        ON AIR
      </text>
      <text x={vertical ? 16 : w - 16} y={vertical ? 28 : 22} fill={accent} fontSize={9} fontWeight={700} textAnchor={vertical ? "start" : "end"}>
        RV-TV
      </text>
      <text x={w / 2} y={vertical ? 78 : 62} fill={ink} fontSize={vertical ? 16 : 18} fontWeight={900} textAnchor="middle">
        {truncate(spec.event, 22)}
      </text>
      <text x={w / 2} y={vertical ? 98 : 80} fill={dark} fontSize={vertical ? 9 : 10} fontWeight={700} textAnchor="middle" letterSpacing="0.08em">
        GUEST CREDENTIAL
      </text>
      <text x={w / 2} y={vertical ? 130 : 108} fill={ink} fontSize={vertical ? 11 : 12} fontWeight={600} textAnchor="middle">
        {truncate(spec.venue, 28)}
      </text>
      <text x={w / 2} y={vertical ? 150 : 126} fill={dark} fontSize={10} textAnchor="middle">
        {spec.date}
      </text>
      <text x={w / 2} y={vertical ? 170 : 144} fill={accent} fontSize={11} fontWeight={800} textAnchor="middle">
        {spec.years}
      </text>
      <rect x={vertical ? 16 : 20} y={vertical ? 250 : h - 44} width={vertical ? w - 32 : 120} height={28} fill={dark} rx={4} />
      <text x={vertical ? w / 2 : 80} y={vertical ? 268 : h - 24} fill="#fff" fontSize={10} fontWeight={800} textAnchor="middle">
        {spec.artifactLabel}
      </text>
      <text x={vertical ? w - 20 : w - 24} y={vertical ? 268 : h - 24} fill={ink} fontSize={10} fontWeight={700} textAnchor="end">
        {spec.passNumber}
      </text>
      {Array.from({ length: 6 }).map((_, i) => (
        <line
          key={i}
          x1={0}
          y1={(vertical ? 190 : 160) + i * 3}
          x2={w}
          y2={(vertical ? 190 : 160) + i * 3}
          stroke={ink}
          strokeOpacity={0.06}
        />
      ))}
    </svg>
  );
}

function CredentialPass({ spec, vertical }: { spec: PassMockupSpec; vertical?: boolean }) {
  const [bg, accent, ink, dark] = spec.palette;
  const w = vertical ? 215 : 340;
  const h = vertical ? 340 : 215;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="cl-pass-mock__svg" role="img" aria-label={`${spec.strategyLabel} pass mockup`}>
      <rect width={w} height={h} fill={bg} rx={6} stroke={dark} strokeWidth={3} />
      <rect x={8} y={8} width={vertical ? w - 16 : 80} height={vertical ? 60 : h - 16} fill={dark} rx={4} />
      <text x={vertical ? w / 2 : 48} y={vertical ? 32 : 40} fill="#fff" fontSize={vertical ? 10 : 9} fontWeight={800} textAnchor="middle" transform={vertical ? undefined : "rotate(-90 48 40)"}>
        VIP
      </text>
      <text x={vertical ? w / 2 : 48} y={vertical ? 48 : 80} fill={accent} fontSize={vertical ? 9 : 8} fontWeight={700} textAnchor="middle" transform={vertical ? undefined : "rotate(-90 48 80)"}>
        ACCESS
      </text>
      <text x={w / 2} y={vertical ? 88 : 36} fill={ink} fontSize={vertical ? 15 : 17} fontWeight={900} textAnchor="middle">
        {truncate(spec.event, 20)}
      </text>
      <text x={w / 2} y={vertical ? 110 : 58} fill={dark} fontSize={9} fontWeight={700} textAnchor="middle">
        BACKSTAGE LAMINATE
      </text>
      <rect x={vertical ? 20 : 100} y={vertical ? 125 : 72} width={vertical ? w - 40 : w - 120} height={22} fill={accent} fillOpacity={0.25} rx={3} />
      <text x={w / 2} y={vertical ? 140 : 87} fill={ink} fontSize={10} fontWeight={700} textAnchor="middle">
        ALL ACCESS · {spec.artifactLabel}
      </text>
      <text x={w / 2} y={vertical ? 175 : 118} fill={ink} fontSize={11} fontWeight={600} textAnchor="middle">
        {truncate(spec.venue, 26)}
      </text>
      <text x={w / 2} y={vertical ? 195 : 138} fill={dark} fontSize={10} textAnchor="middle">
        {spec.date}
      </text>
      <text x={w / 2} y={vertical ? 218 : 160} fill={accent} fontSize={12} fontWeight={800} textAnchor="middle">
        {spec.years}
      </text>
      {Array.from({ length: 8 }).map((_, i) => (
        <rect key={i} x={vertical ? 24 + i * 22 : 100 + i * 28} y={vertical ? h - 52 : h - 36} width={18} height={vertical ? 28 : 20} fill={i % 2 ? ink : "transparent"} fillOpacity={0.15} />
      ))}
      <text x={w - 16} y={vertical ? h - 16 : h - 12} fill={dark} fontSize={10} fontWeight={800} textAnchor="end">
        {spec.passNumber}
      </text>
    </svg>
  );
}

function FestivalPass({ spec, largeYear }: { spec: PassMockupSpec; largeYear?: boolean }) {
  const [bg, accent, ink, dark] = spec.palette;
  const w = 340;
  const h = 215;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="cl-pass-mock__svg" role="img" aria-label={`${spec.strategyLabel} pass mockup`}>
      <rect width={w} height={h} fill={bg} />
      {Array.from({ length: 12 }).map((_, i) => (
        <circle key={i} cx={12} cy={16 + i * 16} r={5} fill="transparent" stroke={dark} strokeWidth={2} strokeDasharray="2 2" />
      ))}
      <rect x={28} y={0} width={w - 28} height={h - 28} fill={bg} stroke={dark} strokeWidth={2} />
      <text x={w / 2 + 8} y={36} fill={accent} fontSize={22} fontWeight={900} textAnchor="middle" letterSpacing="0.04em">
        {largeYear ? spec.years.split(" · ")[0] : truncate(spec.event, 18)}
      </text>
      <text x={w / 2 + 8} y={58} fill={ink} fontSize={14} fontWeight={800} textAnchor="middle">
        {largeYear ? truncate(spec.event, 18) : spec.years}
      </text>
      <text x={w / 2 + 8} y={88} fill={dark} fontSize={11} fontWeight={700} textAnchor="middle">
        {truncate(spec.venue, 30)}
      </text>
      <text x={w / 2 + 8} y={110} fill={ink} fontSize={10} textAnchor="middle">
        {spec.date}
      </text>
      <rect x={48} y={128} width={w - 80} height={32} fill={accent} rx={4} />
      <text x={w / 2 + 8} y={150} fill="#fff" fontSize={12} fontWeight={900} textAnchor="middle">
        {spec.artifactLabel.toUpperCase()}
      </text>
      <text x={w - 20} y={h - 38} fill={dark} fontSize={10} fontWeight={800} textAnchor="end">
        {spec.passNumber}
      </text>
      <line x1={28} y1={h - 28} x2={w} y2={h - 28} stroke={dark} strokeWidth={1} strokeDasharray="6 4" />
      <text x={w / 2 + 8} y={h - 10} fill={dark} fontSize={8} textAnchor="middle">
        ADMIT ONE · FESTIVAL FIELD
      </text>
    </svg>
  );
}

function CollectorPass({ spec, foil }: { spec: PassMockupSpec; foil?: boolean }) {
  const [bg, accent, ink, dark] = spec.palette;
  const w = 340;
  const h = 215;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="cl-pass-mock__svg" role="img" aria-label={`${spec.strategyLabel} pass mockup`}>
      <defs>
        <linearGradient id={`foil-${spec.passNumber}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={accent} />
          <stop offset="50%" stopColor="#fff8e0" />
          <stop offset="100%" stopColor={accent} />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill={bg} rx={4} />
      <rect x={6} y={6} width={w - 12} height={h - 12} fill="none" stroke={`url(#foil-${spec.passNumber})`} strokeWidth={foil ? 6 : 3} rx={2} />
      <text x={w / 2} y={28} fill={dark} fontSize={8} fontWeight={800} textAnchor="middle" letterSpacing="0.14em">
        COLLECTOR EDITION
      </text>
      <text x={w / 2} y={58} fill={ink} fontSize={20} fontWeight={900} textAnchor="middle">
        {truncate(spec.event, 20)}
      </text>
      <text x={w / 2} y={82} fill={accent} fontSize={28} fontWeight={900} textAnchor="middle">
        {spec.passNumber}
      </text>
      <text x={w / 2} y={108} fill={dark} fontSize={9} fontWeight={700} textAnchor="middle">
        LIMITED KEEPSAKE · {spec.artifactLabel}
      </text>
      <text x={w / 2} y={132} fill={ink} fontSize={10} textAnchor="middle">
        {truncate(spec.venue, 28)} · {spec.date}
      </text>
      <text x={w / 2} y={154} fill={accent} fontSize={11} fontWeight={800} textAnchor="middle">
        {spec.years}
      </text>
      <circle cx={w - 40} cy={40} r={22} fill="none" stroke={accent} strokeWidth={2} />
      <text x={w - 40} y={44} fill={accent} fontSize={7} fontWeight={800} textAnchor="middle">
        RV
      </text>
    </svg>
  );
}

function FoilBandPass({ spec }: { spec: PassMockupSpec }) {
  const [bg, accent, ink, dark] = spec.palette;
  const w = 340;
  const h = 215;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="cl-pass-mock__svg" role="img" aria-label={`${spec.strategyLabel} pass mockup`}>
      <rect width={w} height={h} fill={bg} rx={6} />
      <rect x={0} y={0} width={w} height={32} fill={accent} />
      <rect x={0} y={28} width={w} height={6} fill="#fff8e0" opacity={0.7} />
      <text x={w / 2} y={22} fill={dark} fontSize={11} fontWeight={900} textAnchor="middle" letterSpacing="0.1em">
        {spec.artifactLabel.toUpperCase()}
      </text>
      <text x={w / 2} y={68} fill={ink} fontSize={18} fontWeight={900} textAnchor="middle">
        {truncate(spec.event, 22)}
      </text>
      <text x={w / 2} y={96} fill={dark} fontSize={10} textAnchor="middle">
        {truncate(spec.venue, 30)}
      </text>
      <text x={w / 2} y={118} fill={ink} fontSize={10} textAnchor="middle">
        {spec.date} · {spec.years}
      </text>
      <text x={w / 2} y={h - 24} fill={dark} fontSize={11} fontWeight={800} textAnchor="middle">
        {spec.passNumber}
      </text>
    </svg>
  );
}

export function PassMockup(props: Props) {
  const { spec } = props;

  switch (spec.layoutId) {
    case "broadcast-badge":
      return <BroadcastPass spec={spec} vertical={false} />;
    case "laminate-zones":
      return <CredentialPass spec={spec} vertical={false} />;
    case "ticket-stub":
      return <FestivalPass spec={spec} largeYear={false} />;
    case "large-year":
      return <FestivalPass spec={spec} largeYear />;
    case "numbered-edition":
      return <CollectorPass spec={spec} foil />;
    case "foil-band":
      return <FoilBandPass spec={spec} />;
    case "vertical-credential":
      if (spec.strategyId === "credential-focus") return <CredentialPass spec={spec} vertical />;
      if (spec.strategyId === "collector-focus") return <CollectorPass spec={spec} foil={false} />;
      return <BroadcastPass spec={spec} vertical />;
    case "horizontal-credential":
      if (spec.strategyId === "credential-focus") return <CredentialPass spec={spec} />;
      if (spec.strategyId === "festival-focus") return <FestivalPass spec={spec} />;
      return <BroadcastPass spec={spec} />;
    default:
      if (spec.strategyId === "credential-focus") return <CredentialPass spec={spec} />;
      if (spec.strategyId === "festival-focus") return <FestivalPass spec={spec} />;
      if (spec.strategyId === "collector-focus") return <CollectorPass spec={spec} foil />;
      return <BroadcastPass spec={spec} />;
  }
}
