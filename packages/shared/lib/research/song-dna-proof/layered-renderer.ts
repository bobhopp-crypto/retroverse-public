import { hashRvtr, mulberry32 } from "@/lib/research/song-dna-visual-synth/seeded-rng";
import { clamp01, hsl, normLoudness, normTempo } from "@/lib/research/song-dna-visual-synth/normalize";
import type { AcousticMetrics } from "@/lib/research/song-dna-visual-synth/types";

const W = 1200;
const H = 1200;

const KEY_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export type LayerEffect = {
  layer: string;
  metric: string;
  value: string;
  effect: string;
};

export type LayeredRenderResult = {
  svg: string;
  layerEffects: LayerEffect[];
};

function formatKeyMode(metrics: AcousticMetrics): string {
  const keyLabel =
    metrics.key != null && metrics.key >= 0 && metrics.key <= 11
      ? KEY_NAMES[metrics.key]!
      : "unknown";
  const modeLabel =
    metrics.mode === 1 ? "major" : metrics.mode === 0 ? "minor" : "unknown";
  return `${keyLabel} ${modeLabel}`;
}

function valencePalette(valence: number, mode: number | null, key: number | null): string[] {
  const keyShift = key != null ? key * 6 : 0;
  const warmBias = mode === 1 ? 16 : mode === 0 ? -18 : 0;

  if (valence < 0.45) {
    const t = valence / 0.45;
    return [
      hsl(240 + keyShift + warmBias, 42, 14 + t * 10),
      hsl(260 + keyShift, 38, 22),
      hsl(210 + keyShift, 28, 18),
      hsl(200, 22, 10),
    ];
  }
  if (valence > 0.65) {
    const t = (valence - 0.65) / 0.35;
    return [
      hsl(38 + keyShift + warmBias, 78 + t * 10, 52),
      hsl(18 + keyShift, 82, 46),
      hsl(168 + warmBias, 55, 38),
      hsl(48, 60, 28),
    ];
  }
  return [
    hsl(32 + keyShift + warmBias, 55, 38),
    hsl(190 + keyShift, 40, 32),
    hsl(280 + keyShift, 35, 28),
    hsl(45, 45, 22),
  ];
}

function layerBackground(): { svg: string; effect: LayerEffect } {
  return {
    svg: `<rect id="layer-background" width="${W}" height="${H}" fill="#000000"/>`,
    effect: {
      layer: "Background",
      metric: "—",
      value: "black",
      effect: "Canvas starts completely black (#000000).",
    },
  };
}

function layerCanvasTexture(instrumentalness: number, rand: () => number): { svg: string; effect: LayerEffect } {
  const density = Math.round(40 + instrumentalness * 260);
  const opacity = (0.04 + instrumentalness * 0.22).toFixed(3);
  const lines: string[] = [];

  for (let i = 0; i < density; i += 1) {
    const x = rand() * W;
    const y = rand() * H;
    const len = 4 + rand() * 18;
    const angle = rand() * Math.PI;
    const x2 = x + Math.cos(angle) * len;
    const y2 = y + Math.sin(angle) * len;
    lines.push(
      `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#c8c0b0" stroke-width="${(0.3 + rand() * 0.7).toFixed(2)}" opacity="${(0.15 + rand() * 0.35).toFixed(2)}"/>`,
    );
  }

  const weave = `<pattern id="canvas-weave" width="8" height="8" patternUnits="userSpaceOnUse">
    <path d="M0 8 L8 0 M-2 2 L2 -2 M6 10 L10 6" stroke="#888" stroke-width="0.4" opacity="${(0.08 + instrumentalness * 0.12).toFixed(2)}"/>
  </pattern>
  <rect width="${W}" height="${H}" fill="url(#canvas-weave)" opacity="${opacity}"/>`;

  return {
    svg: `<g id="layer-canvas-texture" opacity="${opacity}">${weave}${lines.join("")}</g>`,
    effect: {
      layer: "Canvas Texture",
      metric: "Instrumentalness",
      value: instrumentalness.toFixed(4),
      effect:
        instrumentalness > 0.15
          ? "Dense linen grain — instrumental track reads as woven canvas."
          : instrumentalness > 0.05
            ? "Light cross-hatch texture visible over black."
            : "Minimal grain — vocal-led track, almost smooth canvas.",
    },
  };
}

function layerGlow(loudness: number, palette: string[]): { svg: string; effect: LayerEffect } {
  const loudNorm = normLoudness(loudness);
  const cx = W * 0.5;
  const cy = H * 0.42;
  const r = 180 + loudNorm * 420;
  const opacity = (0.08 + loudNorm * 0.55).toFixed(3);
  const color = palette[0]!;

  return {
    svg: `<g id="layer-glow">
      <radialGradient id="glow-grad" cx="50%" cy="42%" r="60%">
        <stop offset="0%" stop-color="${color}" stop-opacity="${opacity}"/>
        <stop offset="55%" stop-color="${color}" stop-opacity="${(Number(opacity) * 0.35).toFixed(3)}"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
      <ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * 0.75).toFixed(1)}" fill="url(#glow-grad)"/>
    </g>`,
    effect: {
      layer: "Glow",
      metric: "Loudness",
      value: `${loudness.toFixed(2)} dB`,
      effect:
        loudNorm > 0.65
          ? "Broad hot bloom — loud master pushes a wide radial glow."
          : loudNorm < 0.35
            ? "Whisper-soft halo — quiet mix, glow barely escapes center."
            : "Moderate center bloom anchoring the composition.",
    },
  };
}

function layerColorWash(valence: number, palette: string[]): { svg: string; effect: LayerEffect } {
  const opacity = (0.18 + valence * 0.42).toFixed(3);
  const grad =
    valence < 0.45
      ? `<linearGradient id="wash-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${palette[2]!}" stop-opacity="${opacity}"/>
          <stop offset="100%" stop-color="${palette[3]!}" stop-opacity="${(Number(opacity) * 0.7).toFixed(3)}"/>
        </linearGradient>`
      : `<linearGradient id="wash-grad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stop-color="${palette[0]!}" stop-opacity="${opacity}"/>
          <stop offset="50%" stop-color="${palette[1]!}" stop-opacity="${(Number(opacity) * 0.85).toFixed(3)}"/>
          <stop offset="100%" stop-color="${palette[2]!}" stop-opacity="${(Number(opacity) * 0.6).toFixed(3)}"/>
        </linearGradient>`;

  return {
    svg: `<g id="layer-color-wash">${grad}<rect width="${W}" height="${H}" fill="url(#wash-grad)"/></g>`,
    effect: {
      layer: "Color Wash",
      metric: "Valence",
      value: valence.toFixed(4),
      effect:
        valence > 0.7
          ? "Warm gold + teal wash dominates — bright emotional palette."
          : valence < 0.35
            ? "Cool violet/charcoal wash — low valence shadows."
            : "Balanced warm/cool wash between gold and teal.",
    },
  };
}

function layerWatercolorBlooms(acousticness: number, palette: string[], rand: () => number): {
  svg: string;
  effect: LayerEffect;
} {
  const count = Math.round(3 + acousticness * 14);
  const blur = (6 + acousticness * 36).toFixed(1);
  const blobs: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const cx = 80 + rand() * (W - 160);
    const cy = 80 + rand() * (H - 160);
    const rx = 40 + rand() * (80 + acousticness * 120);
    const ry = 30 + rand() * (70 + acousticness * 100);
    const color = palette[i % palette.length]!;
    const op = (0.06 + acousticness * 0.28 + rand() * 0.08).toFixed(3);
    blobs.push(
      `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${color}" opacity="${op}" filter="url(#watercolor-blur)"/>`,
    );
  }

  return {
    svg: `<g id="layer-watercolor-blooms">${blobs.join("")}</g>`,
    effect: {
      layer: "Harmonic Watercolor Blooms",
      metric: "Acousticness",
      value: acousticness.toFixed(4),
      effect:
        acousticness > 0.5
          ? "Heavy wet-on-wet diffusion — acoustic instrumentation bleeds wide."
          : acousticness > 0.25
            ? "Moderate watercolor diffusion with soft edges."
            : "Tight blooms — electronic production, minimal bleed.",
    },
  };
}

function layerPrimaryBrushField(energy: number, palette: string[], rand: () => number): {
  svg: string;
  effect: LayerEffect;
} {
  const strokeCount = Math.round(8 + energy * 28);
  const brushBase = 2 + energy * 22;
  const strokes: string[] = [];

  for (let i = 0; i < strokeCount; i += 1) {
    const color = palette[i % palette.length]!;
    const width = (brushBase * (0.6 + rand() * 0.9)).toFixed(2);
    const opacity = (0.2 + energy * 0.55).toFixed(3);
    const y = 100 + (i / strokeCount) * (H - 200) + (rand() - 0.5) * 40;
    const x0 = 60 + rand() * 80;
    const x3 = W - 60 - rand() * 80;
    const cpSpread = 80 + energy * 160;
    const x1 = W * (0.2 + rand() * 0.2);
    const y1 = y + (rand() - 0.5) * cpSpread;
    const x2 = W * (0.55 + rand() * 0.15);
    const y2 = y + (rand() - 0.5) * cpSpread;
    strokes.push(
      `<path d="M ${x0.toFixed(1)} ${y.toFixed(1)} C ${x1.toFixed(1)} ${y1.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}, ${x3.toFixed(1)} ${y.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" opacity="${opacity}"/>`,
    );
  }

  return {
    svg: `<g id="layer-primary-brush">${strokes.join("")}</g>`,
    effect: {
      layer: "Primary Brush Field",
      metric: "Energy",
      value: energy.toFixed(4),
      effect:
        energy > 0.7
          ? "Thick, high-density paint strokes — high energy attack."
          : energy < 0.35
            ? "Thin, sparse strokes — low energy restraint."
            : "Medium paint density across the field.",
    },
  };
}

function layerMotionRibbons(
  danceability: number,
  tempo: number,
  palette: string[],
  rand: () => number,
): { svg: string; effect: LayerEffect } {
  const tempoNorm = normTempo(tempo);
  const count = Math.round(4 + danceability * 10 + tempoNorm * 6);
  const ribbons: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const color = palette[(i + 1) % palette.length]!;
    const amp = 30 + danceability * 200;
    const y = 80 + i * ((H - 160) / Math.max(count, 1));
    const x0 = 40;
    const x3 = W - 40;
    const wobble = (rand() - 0.5) * danceability * 60;
    const x1 = W * (0.25 + rand() * 0.1);
    const y1 = y + Math.sin(i * 0.8) * amp + wobble;
    const x2 = W * (0.65 + rand() * 0.1);
    const y2 = y - Math.cos(i * 0.6) * amp * 0.85 - wobble;
    const width = (1.5 + danceability * 6 + tempoNorm * 3).toFixed(2);
    const opacity = (0.25 + danceability * 0.45).toFixed(3);
    ribbons.push(
      `<path d="M ${x0} ${y.toFixed(1)} C ${x1.toFixed(1)} ${y1.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}, ${x3} ${y.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" opacity="${opacity}"/>`,
    );
  }

  return {
    svg: `<g id="layer-motion-ribbons">${ribbons.join("")}</g>`,
    effect: {
      layer: "Motion Ribbons",
      metric: "Danceability + Tempo",
      value: `${danceability.toFixed(4)} / ${tempo.toFixed(1)} BPM`,
      effect:
        danceability > 0.7
          ? "Wide sweeping ribbons — groove-forward motion."
          : danceability < 0.35
            ? "Straight, restrained ribbons — stiff rhythmic feel."
            : "Moderate ribbon curvature with tempo-driven spacing.",
    },
  };
}

function layerSplatter(liveness: number, palette: string[], rand: () => number): { svg: string; effect: LayerEffect } {
  const count = Math.round(liveness * 120);
  const dots: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const cx = rand() * W;
    const cy = rand() * H;
    const r = 0.8 + rand() * (2 + liveness * 8);
    const color = palette[i % 2 === 0 ? 0 : 1]!;
    const op = (0.15 + liveness * 0.65).toFixed(3);
    dots.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(2)}" fill="${color}" opacity="${op}"/>`);
  }

  return {
    svg: `<g id="layer-splatter">${dots.join("")}</g>`,
    effect: {
      layer: "Splatter",
      metric: "Liveness",
      value: liveness.toFixed(4),
      effect:
        liveness > 0.5
          ? "Heavy live-room splatter — crowd/room energy visible."
          : liveness < 0.15
            ? "Almost no splatter — studio-clean capture."
            : "Light scatter — polished studio with slight air.",
    },
  };
}

function layerFineDetail(speechiness: number, palette: string[], rand: () => number): {
  svg: string;
  effect: LayerEffect;
} {
  const count = Math.round(speechiness * 45);
  const marks: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const cx = 100 + rand() * (W - 200);
    const cy = 100 + rand() * (H - 200);
    const size = 6 + speechiness * 36 + rand() * 10;
    const spikes = 3 + Math.round(speechiness * 5);
    const points: string[] = [];
    for (let s = 0; s < spikes; s += 1) {
      const angle = (s / spikes) * Math.PI * 2 + rand() * 0.4;
      const r = size * (0.5 + rand() * 0.7);
      points.push(`${(cx + Math.cos(angle) * r).toFixed(1)},${(cy + Math.sin(angle) * r).toFixed(1)}`);
    }
    marks.push(
      `<polygon points="${points.join(" ")}" fill="${palette[2] ?? palette[0]!}" opacity="${(0.2 + speechiness * 0.5).toFixed(3)}"/>`,
    );
  }

  return {
    svg: `<g id="layer-fine-detail">${marks.join("")}</g>`,
    effect: {
      layer: "Fine Detail",
      metric: "Speechiness",
      value: speechiness.toFixed(4),
      effect:
        speechiness > 0.1
          ? "Angular ink shards — spoken-word texture on top."
          : speechiness > 0.05
            ? "Sparse angular ticks — mostly sung vocal."
            : "Smooth surface — negligible speech texture.",
    },
  };
}

function layerSignatureHighlights(
  metrics: AcousticMetrics,
  palette: string[],
  rand: () => number,
): { svg: string; effect: LayerEffect } {
  const key = metrics.key ?? Math.floor(rand() * 12);
  const mode = metrics.mode ?? 1;
  const spots = 3 + (mode === 1 ? 2 : 1);
  const highlights: string[] = [];

  for (let i = 0; i < spots; i += 1) {
    const angle = ((key / 12) * Math.PI * 2 + (i / spots) * Math.PI * 2) % (Math.PI * 2);
    const radius = 220 + i * 90;
    const cx = W / 2 + Math.cos(angle) * radius * 0.35;
    const cy = H / 2 + Math.sin(angle) * radius * 0.35;
    const r = 8 + (mode === 1 ? 14 : 8);
    const color = mode === 1 ? palette[0]! : palette[2] ?? palette[1]!;
    const op = mode === 1 ? "0.55" : "0.38";
    highlights.push(
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" fill="${color}" opacity="${op}" filter="url(#highlight-glow)"/>`,
    );
  }

  return {
    svg: `<g id="layer-signature-highlights">${highlights.join("")}</g>`,
    effect: {
      layer: "Signature Highlights",
      metric: "Key + Mode",
      value: formatKeyMode(metrics),
      effect:
        metrics.mode === 1
          ? "Major — warm highlight constellation on golden points."
          : metrics.mode === 0
            ? "Minor — cooler highlight spots, shadow-leaning."
            : "Neutral highlight placement from pitch class (mode unknown).",
    },
  };
}

export function renderLayeredSongDna(metrics: AcousticMetrics): LayeredRenderResult {
  const rand = mulberry32(hashRvtr(metrics.rvtr));
  const palette = valencePalette(metrics.valence, metrics.mode, metrics.key);
  const watercolor = layerWatercolorBlooms(metrics.acousticness, palette, rand);
  const blur = (6 + metrics.acousticness * 36).toFixed(1);

  const layers = [
    layerBackground(),
    layerCanvasTexture(metrics.instrumentalness, rand),
    layerGlow(metrics.loudness, palette),
    layerColorWash(metrics.valence, palette),
    watercolor,
    layerPrimaryBrushField(metrics.energy, palette, rand),
    layerMotionRibbons(metrics.danceability, metrics.tempo, palette, rand),
    layerSplatter(metrics.liveness, palette, rand),
    layerFineDetail(metrics.speechiness, palette, rand),
    layerSignatureHighlights(metrics, palette, rand),
  ];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <filter id="watercolor-blur" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="${blur}"/>
    </filter>
    <filter id="highlight-glow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="6"/>
    </filter>
  </defs>
  ${layers.map((l) => l.svg).join("\n  ")}
</svg>`;

  return {
    svg,
    layerEffects: layers.map((l) => l.effect),
  };
}

export function renderLayeredSongDnaHash(metrics: AcousticMetrics): string {
  const { svg } = renderLayeredSongDna(metrics);
  let h = 2166136261;
  for (let i = 0; i < svg.length; i += 1) {
    h ^= svg.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
