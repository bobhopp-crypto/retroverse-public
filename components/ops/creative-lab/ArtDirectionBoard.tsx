"use client";

import { artDirectionById } from "@/lib/ops/creative-lab/art-directions";
import type { ArtBoardSpec } from "@/lib/ops/creative-lab/art-board-spec";

type Props = {
  spec: ArtBoardSpec;
  compact?: boolean;
};

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function EventStrip({ spec }: { spec: ArtBoardSpec }) {
  return (
    <g className="cl-art-board__event">
      <rect x={20} y={492} width={360} height={48} fill="rgba(0,0,0,0.62)" rx={3} />
      <text x={200} y={512} fill="#fff" fontSize={10} fontWeight={700} textAnchor="middle" opacity={0.92}>
        {truncate(spec.event, 28)}
      </text>
      <text x={200} y={528} fill="#fff" fontSize={8} textAnchor="middle" opacity={0.72}>
        {truncate(spec.venue, 22)}{spec.date ? ` · ${truncate(spec.date, 16)}` : ""}
      </text>
    </g>
  );
}

function PsychedelicBoard({ spec }: { spec: ArtBoardSpec }) {
  const [orange, gold, red, purple, cream] = artDirectionById("psychedelic-festival").palette;
  const dense = spec.treatment?.illustrationDensity !== "light";
  const ornate = spec.treatment?.borderTreatment.includes("ornate") || spec.treatment?.borderTreatment.includes("paisley") || !spec.treatment;
  return (
    <svg viewBox="0 0 400 560" className="cl-art-board__svg" role="img" aria-label="Psychedelic Festival artwork">
      <defs>
        <radialGradient id="psy-sun" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor={gold} stopOpacity={0.9} />
          <stop offset="60%" stopColor={orange} stopOpacity={0.5} />
          <stop offset="100%" stopColor={purple} stopOpacity={0.2} />
        </radialGradient>
      </defs>
      <rect width={400} height={560} fill={cream} />
      {ornate ? (
        <>
          <path d="M12,12 C80,0 320,0 388,12 C400,80 400,480 388,548 C320,560 80,560 12,548 C0,480 0,80 12,12" fill="none" stroke={orange} strokeWidth={dense ? 10 : 6} />
          <path d="M24,24 C90,36 310,36 376,24 C388,90 388,470 376,536 C310,524 90,524 24,536 C12,470 12,90 24,24" fill="none" stroke={red} strokeWidth={3} opacity={0.55} />
          {Array.from({ length: 12 }).map((_, i) => {
            const t = i / 12;
            const x = 24 + t * 352;
            return (
              <ellipse key={i} cx={x} cy={28} rx={14} ry={8} fill={i % 2 ? gold : purple} opacity={0.5} />
            );
          })}
        </>
      ) : (
        <rect x={16} y={16} width={368} height={528} fill="none" stroke={orange} strokeWidth={4} rx={8} />
      )}
      <circle cx={200} cy={230} r={dense ? 130 : 100} fill="url(#psy-sun)" />
      {Array.from({ length: dense ? 24 : 16 }).map((_, i) => {
        const a = (i / (dense ? 24 : 16)) * Math.PI * 2 - Math.PI / 2;
        const inner = 45;
        const outer = dense ? 155 : 115;
        return (
          <line
            key={i}
            x1={200 + Math.cos(a) * inner}
            y1={230 + Math.sin(a) * inner}
            x2={200 + Math.cos(a) * outer}
            y2={230 + Math.sin(a) * outer}
            stroke={i % 3 === 0 ? red : i % 3 === 1 ? gold : orange}
            strokeWidth={dense ? 3 : 2}
            opacity={0.65}
          />
        );
      })}
      <text x={200} y={205} fill={purple} fontSize={dense ? 34 : 28} fontWeight={900} textAnchor="middle" fontFamily="Georgia, serif">
        {truncate(spec.event, 12).toUpperCase()}
      </text>
      <text x={200} y={248} fill={red} fontSize={dense ? 42 : 32} fontWeight={900} textAnchor="middle">
        ☮
      </text>
      {dense ? (
        <>
          <path d="M60,380 Q100,350 140,380 T220,380 T300,380" fill="none" stroke={purple} strokeWidth={3} />
          <circle cx={70} cy={100} r={18} fill={gold} opacity={0.6} />
          <circle cx={330} cy={110} r={14} fill={red} opacity={0.55} />
          <path d="M50,420 C90,400 130,440 170,420 S250,400 290,430 S340,410 360,440" fill={orange} opacity={0.35} />
        </>
      ) : null}
      <ellipse cx={200} cy={420} rx={110} ry={22} fill={red} opacity={0.2} />
      <text x={200} y={428} fill={purple} fontSize={12} fontWeight={800} textAnchor="middle" letterSpacing={2}>
        {spec.passNumber}
      </text>
      <EventStrip spec={spec} />
    </svg>
  );
}

function CartoonBoard({ spec }: { spec: ArtBoardSpec }) {
  const [orange, teal, yellow, ink, cream] = artDirectionById("saturday-morning-cartoon").palette;
  const dense = spec.treatment?.illustrationDensity !== "light";
  return (
    <svg viewBox="0 0 400 560" className="cl-art-board__svg" role="img" aria-label="Saturday Morning Cartoon artwork">
      <rect width={400} height={560} fill={teal} />
      <rect x={14} y={14} width={372} height={532} fill={cream} stroke={ink} strokeWidth={dense ? 12 : 8} rx={14} />
      <rect x={30} y={30} width={340} height={72} fill={orange} stroke={ink} strokeWidth={5} rx={10} />
      <text x={200} y={78} fill={cream} fontSize={dense ? 26 : 22} fontWeight={900} textAnchor="middle" fontFamily="Arial Black, sans-serif">
        {truncate(spec.event, 14).toUpperCase()}
      </text>
      <circle cx={110} cy={220} r={62} fill={yellow} stroke={ink} strokeWidth={6} />
      <ellipse cx={88} cy={200} rx={14} ry={18} fill={cream} stroke={ink} strokeWidth={3} />
      <ellipse cx={132} cy={200} rx={14} ry={18} fill={cream} stroke={ink} strokeWidth={3} />
      <circle cx={92} cy={204} r={5} fill={ink} />
      <circle cx={136} cy={204} r={5} fill={ink} />
      <path d="M88,248 Q110,272 132,248" fill="none" stroke={ink} strokeWidth={4} strokeLinecap="round" />
      <rect x={210} y={165} width={150} height={110} fill={orange} stroke={ink} strokeWidth={5} rx={8} />
      <text x={285} y={228} fill={cream} fontSize={dense ? 20 : 16} fontWeight={900} textAnchor="middle">
        VIP
      </text>
      {dense ? (
        <>
          <polygon points="320,310 350,360 290,360" fill={teal} stroke={ink} strokeWidth={4} />
          <polygon points="50,320 85,370 15,370" fill={orange} stroke={ink} strokeWidth={4} />
          <text x={200} y={340} fill={ink} fontSize={48} fontWeight={900} textAnchor="middle">★</text>
          <line x1={60} y1={400} x2={340} y2={400} stroke={ink} strokeWidth={3} strokeDasharray="12 8" />
        </>
      ) : (
        <path d="M60,400 L100,360 L140,400 L180,360 L220,400 L260,360 L300,400" fill="none" stroke={ink} strokeWidth={4} />
      )}
      <rect x={130} y={410} width={140} height={56} fill={yellow} stroke={ink} strokeWidth={5} rx={8} />
      <text x={200} y={448} fill={ink} fontSize={18} fontWeight={900} textAnchor="middle">
        {spec.passNumber}
      </text>
      <EventStrip spec={spec} />
    </svg>
  );
}

function TelevisionBoard({ spec }: { spec: ArtBoardSpec }) {
  const [navy, gold, cream, red, blue] = artDirectionById("vintage-television").palette;
  const dense = spec.treatment?.illustrationDensity !== "light";
  return (
    <svg viewBox="0 0 400 560" className="cl-art-board__svg" role="img" aria-label="Vintage Television artwork">
      <rect width={400} height={560} fill={navy} />
      <rect x={20} y={20} width={360} height={420} fill={blue} stroke={gold} strokeWidth={8} rx={10} />
      <rect x={36} y={36} width={328} height={300} fill="#060d18" />
      {dense ? (
        Array.from({ length: 10 }).map((_, i) => (
          <line key={i} x1={36} y1={50 + i * 30} x2={364} y2={50 + i * 30} stroke="#fff" strokeWidth={1} opacity={0.05} />
        ))
      ) : null}
      <circle cx={68} cy={68} r={16} fill={red} />
      <text x={92} y={74} fill={cream} fontSize={13} fontWeight={900} letterSpacing={2}>ON AIR</text>
      <rect x={280} y={52} width={72} height={28} fill={gold} opacity={0.25} rx={4} />
      <text x={316} y={71} fill={gold} fontSize={10} fontWeight={800} textAnchor="middle">LIVE</text>
      <text x={200} y={155} fill={gold} fontSize={dense ? 30 : 24} fontWeight={900} textAnchor="middle" letterSpacing={3}>
        {truncate(spec.event, 14).toUpperCase()}
      </text>
      <rect x={100} y={175} width={200} height={10} fill={gold} opacity={0.55} />
      <ellipse cx={200} cy={270} rx={90} ry={50} fill={gold} opacity={0.12} />
      <text x={200} y={265} fill={cream} fontSize={11} textAnchor="middle" opacity={0.85} letterSpacing={2}>
        GUEST APPEARANCE
      </text>
      <text x={200} y={290} fill={cream} fontSize={10} textAnchor="middle" opacity={0.6}>
        {spec.years || "RETRO SPECIAL"}
      </text>
      {dense ? (
        <>
          <path d="M120,320 L200,250 L280,320" fill="none" stroke={gold} strokeWidth={2} opacity={0.4} />
          <rect x={150} y={350} width={100} height={6} fill={red} opacity={0.7} />
        </>
      ) : null}
      <rect x={90} y={455} width={220} height={48} fill={gold} opacity={0.18} rx={4} />
      <text x={200} y={486} fill={gold} fontSize={15} fontWeight={900} textAnchor="middle" letterSpacing={2}>
        {spec.passNumber}
      </text>
      <EventStrip spec={spec} />
    </svg>
  );
}

function CollectorBoard({ spec }: { spec: ArtBoardSpec }) {
  const [tan, brown, cream, ink, gold] = artDirectionById("collector-memorabilia").palette;
  const dense = spec.treatment?.illustrationDensity !== "light";
  return (
    <svg viewBox="0 0 400 560" className="cl-art-board__svg" role="img" aria-label="Collector Memorabilia artwork">
      <rect width={400} height={560} fill="#e8dcc8" />
      <rect x={18} y={18} width={364} height={524} fill={cream} stroke={gold} strokeWidth={dense ? 7 : 5} />
      <rect x={28} y={28} width={344} height={504} fill="none" stroke={brown} strokeWidth={2} />
      <text x={200} y={62} fill={brown} fontSize={11} fontWeight={900} textAnchor="middle" letterSpacing={4}>
        COLLECTOR EDITION
      </text>
      <rect x={50} y={85} width={300} height={340} fill={tan} stroke={ink} strokeWidth={4} rx={6} />
      <rect x={70} y={105} width={260} height={200} fill={cream} stroke={brown} strokeWidth={2} />
      <text x={200} y={195} fill={ink} fontSize={dense ? 52 : 40} fontWeight={900} textAnchor="middle">
        {spec.passNumber}
      </text>
      <text x={200} y={245} fill={brown} fontSize={dense ? 22 : 18} fontWeight={800} textAnchor="middle">
        {truncate(spec.event, 16)}
      </text>
      <line x1={80} y1={330} x2={320} y2={330} stroke={brown} strokeWidth={1} strokeDasharray="10 5" />
      <text x={200} y={360} fill={ink} fontSize={10} textAnchor="middle" opacity={0.75} letterSpacing={1}>
        LIMITED KEEPSAKE · ADMIT ONE
      </text>
      {dense ? (
        <>
          <circle cx={75} cy={110} r={22} fill="none" stroke={gold} strokeWidth={3} />
          <circle cx={325} cy={110} r={22} fill="none" stroke={gold} strokeWidth={3} />
          <text x={75} y={115} fill={gold} fontSize={8} textAnchor="middle" fontWeight={800}>FOIL</text>
          <text x={325} y={115} fill={gold} fontSize={8} textAnchor="middle" fontWeight={800}>FOIL</text>
        </>
      ) : null}
      <rect x={120} y={400} width={160} height={36} fill={brown} opacity={0.15} rx={3} />
      <text x={200} y={424} fill={brown} fontSize={10} fontWeight={700} textAnchor="middle">
        {spec.years || "VINTAGE SERIES"}
      </text>
      <EventStrip spec={spec} />
    </svg>
  );
}

export function ArtDirectionBoard(props: Props) {
  const { spec } = props;
  switch (spec.artDirectionId) {
    case "saturday-morning-cartoon":
      return <CartoonBoard spec={spec} />;
    case "vintage-television":
      return <TelevisionBoard spec={spec} />;
    case "collector-memorabilia":
      return <CollectorBoard spec={spec} />;
    default:
      return <PsychedelicBoard spec={spec} />;
  }
}
