import type {
  CollectorSongDna,
  SongDnaLabeledMetric,
  SongDnaMusical,
  SongDnaVisual,
} from "@/lib/ops/studio/collector/song-dna-types";

function metricValue(metric: SongDnaLabeledMetric | undefined, fallback = 0.5): number {
  if (!metric) return fallback;
  if (typeof metric.value === "number" && Number.isFinite(metric.value)) {
    if (metric.value > 1 && metric.label.toLowerCase().includes("bpm")) {
      return Math.min(1, Math.max(0, (metric.value - 60) / 140));
    }
    if (metric.value <= 0 && metric.value >= -60) {
      return Math.min(1, Math.max(0, (metric.value + 60) / 60));
    }
    return Math.min(1, Math.max(0, metric.value));
  }
  return fallback;
}

function paletteColors(visual: SongDnaVisual | null): string[] {
  if (visual?.dominantPalette?.length) {
    return visual.dominantPalette.slice(0, 6);
  }
  return ["#1a4a52", "#3dbfb0", "#e07a4a", "#f4e8d8", "#2a1f3d", "#6b8cae"];
}

function hslFromMetric(value: number, offset: number): string {
  const hue = Math.round((value * 280 + offset * 47) % 360);
  const sat = Math.round(42 + value * 38);
  const light = Math.round(34 + (1 - value) * 28);
  return `hsl(${hue} ${sat}% ${light}%)`;
}

/** Programmatic full-screen watercolor — no text, no metrics. */
export function buildSongDnaWatercolorSvg(dna: CollectorSongDna): string {
  const musical = dna.musical;
  const visual = dna.visual;
  const palette = paletteColors(visual);

  const energy = metricValue(musical?.energy);
  const valence = metricValue(musical?.valence);
  const dance = metricValue(musical?.danceability);
  const acoustic = metricValue(musical?.acousticness);
  const instrumental = metricValue(musical?.instrumentalness);
  const speech = metricValue(musical?.speechiness);
  const tempo = metricValue(musical?.tempo, 0.45);
  const liveness = metricValue(musical?.liveness);
  const loudness = metricValue(
    (musical as SongDnaMusical & { loudness?: SongDnaLabeledMetric })?.loudness,
    0.55,
  );

  const washCount = 7 + Math.round(energy * 4);
  const blobs: string[] = [];

  for (let i = 0; i < washCount; i += 1) {
    const t = i / Math.max(1, washCount - 1);
    const metrics = [energy, valence, dance, acoustic, instrumental, speech, tempo, liveness, loudness];
    const m = metrics[i % metrics.length] ?? 0.5;
    const cx = 540 + Math.sin(t * Math.PI * 2 + valence * 6) * (180 + dance * 220);
    const cy = 960 + Math.cos(t * Math.PI * 1.6 + energy * 5) * (320 + tempo * 180);
    const rx = 120 + m * 280 + acoustic * 80;
    const ry = 90 + m * 240 + liveness * 70;
    const rotate = (t * 140 + instrumental * 90).toFixed(1);
    const color = palette[i % palette.length] ?? hslFromMetric(m, i);
    const opacity = (0.18 + m * 0.42).toFixed(2);

    blobs.push(`
      <ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${rx.toFixed(0)}" ry="${ry.toFixed(0)}"
        fill="${color}" opacity="${opacity}" transform="rotate(${rotate} ${cx.toFixed(0)} ${cy.toFixed(0)})"
        filter="url(#wc-blur)" />`);
  }

  const accent = visual?.accentColor ?? palette[2] ?? "#e07a4a";
  const base = visual?.primaryColor ?? palette[0] ?? "#111114";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" role="img" aria-hidden="true">
  <defs>
    <filter id="wc-blur" x="-40%" y="-40%" width="180%" height="180%">
      <feTurbulence type="fractalNoise" baseFrequency="${(0.004 + speech * 0.012).toFixed(4)}" numOctaves="3" seed="${Math.round(valence * 100)}" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="${Math.round(18 + dance * 42)}" xChannelSelector="R" yChannelSelector="G"/>
      <feGaussianBlur stdDeviation="${(12 + acoustic * 18).toFixed(1)}"/>
    </filter>
    <linearGradient id="wc-base" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${base}" stop-opacity="0.95"/>
      <stop offset="55%" stop-color="${palette[1] ?? base}" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.35"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#wc-base)"/>
  ${blobs.join("\n")}
  <rect width="1080" height="1920" fill="${accent}" opacity="${(0.04 + valence * 0.08).toFixed(2)}" filter="url(#wc-blur)"/>
</svg>`;
}

export function songDnaWatercolorDataUrl(dna: CollectorSongDna): string {
  const svg = buildSongDnaWatercolorSvg(dna);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
