import { hashRvtr, mulberry32 } from "./seeded-rng";
import { clamp01, hsl, normLoudness, normTempo } from "./normalize";
import type { AcousticMetrics, SynthVisualNotes } from "./types";

const WIDTH = 1200;
const HEIGHT = 1200;

function paletteFromValence(valence: number, mode: number | null, key: number | null): string[] {
  const keyShift = key != null ? key * 8 : 0;
  const warmBias = mode === 1 ? 18 : mode === 0 ? -22 : 0;

  if (valence < 0.5) {
    const t = valence * 2;
    return [
      hsl(248 + keyShift + warmBias, 38 + t * 12, 12 + t * 8),
      hsl(268 + keyShift, 42, 22 + t * 10),
      hsl(220 + keyShift, 28, 18 + t * 6),
      hsl(210, 18, 10),
    ];
  }

  const t = (valence - 0.5) * 2;
  return [
    hsl(32 + keyShift + warmBias, 78 + t * 12, 48 + t * 10),
    hsl(18 + keyShift, 85, 42 + t * 8),
    hsl(8 + keyShift, 72, 36),
    hsl(45 + warmBias, 55, 24),
  ];
}

function buildFlowPath(
  index: number,
  total: number,
  metrics: AcousticMetrics,
  rand: () => number,
): string {
  const tempoNorm = normTempo(metrics.tempo);
  const spacing = 80 + (1 - tempoNorm) * 120;
  const y = 120 + index * spacing + rand() * metrics.liveness * 28;
  const x0 = 80 + rand() * 40;
  const x3 = WIDTH - 80 - rand() * 40;
  const amp = 40 + metrics.danceability * 220 + metrics.energy * 80;
  const wobble = (rand() - 0.5) * metrics.liveness * 90;
  const x1 = WIDTH * (0.25 + rand() * 0.15) + wobble;
  const y1 = y + Math.sin(index * 0.7) * amp;
  const x2 = WIDTH * (0.55 + rand() * 0.15) - wobble;
  const y2 = y - Math.cos(index * 0.9) * amp * 0.85;

  return `M ${x0.toFixed(1)} ${y.toFixed(1)} C ${x1.toFixed(1)} ${y1.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}, ${x3.toFixed(1)} ${(y + wobble * 0.2).toFixed(1)}`;
}

function buildInkMark(
  index: number,
  metrics: AcousticMetrics,
  rand: () => number,
  color: string,
): string {
  const cx = 100 + rand() * (WIDTH - 200);
  const cy = 100 + rand() * (HEIGHT - 200);
  const size = 8 + metrics.speechiness * 40 + rand() * 12;
  const rot = rand() * 360;
  const points: string[] = [];
  const spikes = 3 + Math.round(metrics.speechiness * 5);

  for (let i = 0; i < spikes; i += 1) {
    const angle = (i / spikes) * Math.PI * 2 + rand() * metrics.liveness;
    const r = size * (0.6 + rand() * 0.8);
    points.push(`${(cx + Math.cos(angle) * r).toFixed(1)},${(cy + Math.sin(angle) * r).toFixed(1)}`);
  }

  return `<polygon points="${points.join(" ")}" fill="${color}" opacity="${(0.25 + metrics.speechiness * 0.45).toFixed(2)}" transform="rotate(${rot.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`;
}

function buildDetailStroke(
  index: number,
  metrics: AcousticMetrics,
  rand: () => number,
  color: string,
): string {
  const cx = 140 + rand() * (WIDTH - 280);
  const cy = 140 + rand() * (HEIGHT - 280);
  const len = 20 + metrics.instrumentalness * 120;
  const angle = rand() * Math.PI * 2;
  const x2 = cx + Math.cos(angle) * len;
  const y2 = cy + Math.sin(angle) * len;
  const width = 0.4 + metrics.instrumentalness * 2.2;

  return `<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${width.toFixed(2)}" stroke-linecap="round" opacity="${(0.15 + metrics.instrumentalness * 0.35).toFixed(2)}"/>`;
}

export function synthesizeSongDnaVisual(metrics: AcousticMetrics): { svg: string; notes: SynthVisualNotes } {
  const rand = mulberry32(hashRvtr(metrics.rvtr));
  const tempoNorm = normTempo(metrics.tempo);
  const loudNorm = normLoudness(metrics.loudness);
  const palette = paletteFromValence(metrics.valence, metrics.mode, metrics.key);

  const strokeCount = Math.round(6 + tempoNorm * 14 + metrics.energy * 4);
  const blurRadius = (metrics.acousticness * 22 + 1).toFixed(1);
  const brushSize = 2 + metrics.energy * 16;
  const strokeOpacity = clamp01(0.22 + loudNorm * 0.55);
  const warmthOverlay = metrics.mode === 1 ? 0.12 : metrics.mode === 0 ? 0 : 0.06;
  const coolShadow = metrics.mode === 0 ? 0.14 : 0.05;

  const flowPaths: string[] = [];
  for (let i = 0; i < strokeCount; i += 1) {
    const color = palette[i % palette.length]!;
    const width = (brushSize * (0.7 + rand() * 0.8)).toFixed(2);
    const path = buildFlowPath(i, strokeCount, metrics, rand);
    flowPaths.push(
      `<path d="${path}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" opacity="${strokeOpacity.toFixed(2)}" filter="url(#dna-bleed)"/>`,
    );
  }

  const detailCount = Math.round(metrics.instrumentalness * 90);
  const detailStrokes = Array.from({ length: detailCount }, (_, i) =>
    buildDetailStroke(i, metrics, rand, palette[2] ?? palette[0]!),
  );

  const inkCount = Math.round(metrics.speechiness * 18);
  const inkMarks = Array.from({ length: inkCount }, (_, i) =>
    buildInkMark(i, metrics, rand, palette[1] ?? palette[0]!),
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <filter id="dna-bleed" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="${blurRadius}"/>
    </filter>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#000000"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${palette[3] ?? "#111"}" opacity="${coolShadow.toFixed(2)}"/>
  <g id="flow-strokes">${flowPaths.join("\n")}</g>
  <g id="detail-strokes">${detailStrokes.join("\n")}</g>
  <g id="ink-marks">${inkMarks.join("\n")}</g>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${palette[0]!}" opacity="${warmthOverlay.toFixed(2)}" style="mix-blend-mode:screen"/>
</svg>`;

  return {
    svg,
    notes: {
      palette,
      strokeCount,
      avgBrushSize: brushSize,
      curveAmplitude: 40 + metrics.danceability * 220,
      contrast: loudNorm,
      blurRadius: Number(blurRadius),
      detailStrokes: detailCount,
      inkMarks: inkCount,
      warmthBias: metrics.mode === 1 ? 1 : metrics.mode === 0 ? -1 : 0,
    },
  };
}

export function synthesizeSongDnaVisualHash(metrics: AcousticMetrics): string {
  return hashRvtr(`${metrics.rvtr}:${JSON.stringify(metrics)}`).toString(16);
}
