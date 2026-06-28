#!/usr/bin/env node
/**
 * Song DNA Visual Synthesizer — proof-of-concept.
 *
 * Usage: npm run research:song-dna-visual-synth
 */
require("../finance/preload-server-only.cjs");

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import {
  describeMetricEffects,
  loadAcousticMetrics,
} from "../../lib/research/song-dna-visual-synth/load-acoustic-metrics.ts";
import { slugify } from "../../lib/research/song-dna-visual-synth/normalize.ts";
import { renderSvgToPng } from "../../lib/research/song-dna-visual-synth/render-png.ts";
import {
  synthesizeSongDnaVisual,
  synthesizeSongDnaVisualHash,
} from "../../lib/research/song-dna-visual-synth/synthesize-visual.ts";
import type { AcousticMetrics } from "../../lib/research/song-dna-visual-synth/types.ts";

const REPORT_DIR = join(process.cwd(), "reports/song-dna-visual-synth");
const IMAGE_DIR = join(REPORT_DIR, "images");

const PROOF_SONGS = [
  { rvtr: "RVTR508702", label: "The Outfield — Your Love" },
  { rvtr: "RVTR569927", label: "Fleetwood Mac — Dreams" },
  { rvtr: "RVTR678114", label: "Stevie Wonder — Superstition" },
  { rvtr: "RVTR590442", label: "A-ha — Take On Me" },
  { rvtr: "RVTR417030", label: "Phil Collins — In The Air Tonight" },
];

function metricRow(label: string, value: string | number | null): string {
  return `| ${label} | ${value ?? "—"} |`;
}

function formatMetricsTable(metrics: AcousticMetrics): string {
  return [
    "| Metric | Value |",
    "|---|---|",
    metricRow("RVTR", metrics.rvtr),
    metricRow("Source", metrics.source),
    metricRow("Danceability", metrics.danceability.toFixed(4)),
    metricRow("Energy", metrics.energy.toFixed(4)),
    metricRow("Valence", metrics.valence.toFixed(4)),
    metricRow("Acousticness", metrics.acousticness.toFixed(4)),
    metricRow("Instrumentalness", metrics.instrumentalness.toFixed(6)),
    metricRow("Speechiness", metrics.speechiness.toFixed(4)),
    metricRow("Liveness", metrics.liveness.toFixed(4)),
    metricRow("Tempo (BPM)", metrics.tempo.toFixed(2)),
    metricRow("Loudness (dB)", metrics.loudness.toFixed(2)),
    metricRow("Key (pitch class)", metrics.key ?? "unknown"),
    metricRow("Mode", metrics.mode === 1 ? "major" : metrics.mode === 0 ? "minor" : "unknown"),
    metricRow("Time signature", metrics.timeSignature ?? "unknown"),
  ].join("\n");
}

function formatEffects(metrics: AcousticMetrics): string {
  const effects = describeMetricEffects(metrics);
  return Object.entries(effects)
    .map(([metric, note]) => `- **${metric}** — ${note}`)
    .join("\n");
}

function comparisonNotes(rows: Array<{ label: string; metrics: AcousticMetrics }>): string {
  const byValence = [...rows].sort((a, b) => b.metrics.valence - a.metrics.valence);
  const byEnergy = [...rows].sort((a, b) => b.metrics.energy - a.metrics.energy);
  const byTempo = [...rows].sort((a, b) => b.metrics.tempo - a.metrics.tempo);

  return [
    "### Valence spread",
    `- Brightest palette: **${byValence[0]!.label}** (valence ${byValence[0]!.metrics.valence.toFixed(3)})`,
    `- Darkest palette: **${byValence[byValence.length - 1]!.label}** (valence ${byValence[byValence.length - 1]!.metrics.valence.toFixed(3)})`,
    "",
    "### Energy spread",
    `- Highest energy strokes: **${byEnergy[0]!.label}** (${byEnergy[0]!.metrics.energy.toFixed(3)})`,
    `- Lowest energy strokes: **${byEnergy[byEnergy.length - 1]!.label}** (${byEnergy[byEnergy.length - 1]!.metrics.energy.toFixed(3)})`,
    "",
    "### Tempo spread",
    `- Densest rhythm: **${byTempo[0]!.label}** (${byTempo[0]!.metrics.tempo.toFixed(1)} BPM)`,
    `- Sparsest rhythm: **${byTempo[byTempo.length - 1]!.label}** (${byTempo[byTempo.length - 1]!.metrics.tempo.toFixed(1)} BPM)`,
    "",
    "### Expected visual separation",
    "- **Take On Me** should read hottest and brightest (high valence + energy).",
    "- **In The Air Tonight** should read cool, sparse, and shadow-heavy (low valence + tempo).",
    "- **Dreams** liveness (~0.97) should show the most jitter/imperfection in flow paths.",
    "- **Superstition** sits mid-high valence with moderate funk groove (danceability).",
    "- **Your Love** balances moderate metrics — a mid-warm 80s synth-rock wash.",
  ].join("\n");
}

async function main() {
  await mkdir(IMAGE_DIR, { recursive: true });

  const results: Array<{
    label: string;
    metrics: AcousticMetrics;
    imageFile: string;
    hash: string;
    notes: ReturnType<typeof synthesizeSongDnaVisual>["notes"];
  }> = [];

  for (const song of PROOF_SONGS) {
    const metrics = await loadAcousticMetrics(song.rvtr);
    if (!metrics) {
      console.error(`Missing metrics for ${song.rvtr}`);
      continue;
    }

    const { svg, notes } = synthesizeSongDnaVisual(metrics);
    const hash = synthesizeSongDnaVisualHash(metrics);
    const imageFile = `${metrics.rvtr}-${slugify(metrics.title)}.png`;
    const png = await renderSvgToPng(svg);

    await writeFile(join(IMAGE_DIR, imageFile), png);
    await writeFile(join(IMAGE_DIR, `${metrics.rvtr}-${slugify(metrics.title)}.svg`), svg, "utf8");

    results.push({ label: song.label, metrics, imageFile, hash, notes });
    console.log(`✓ ${song.label} → images/${imageFile} (${hash})`);
  }

  if (results.length === 0) {
    console.error("No images generated.");
    process.exit(1);
  }

  // Determinism check — re-render first song and compare hash
  const first = results[0]!;
  const secondPass = synthesizeSongDnaVisual(first.metrics);
  const secondHash = synthesizeSongDnaVisualHash(first.metrics);
  const deterministic = secondHash === first.hash && secondPass.svg === synthesizeSongDnaVisual(first.metrics).svg;

  const sections = results.map((entry) => {
    return [
      `## ${entry.label}`,
      "",
      formatMetricsTable(entry.metrics),
      "",
      `![${entry.label}](images/${entry.imageFile})`,
      "",
      "### Metric → visual mapping",
      formatEffects(entry.metrics),
      "",
      "### Synthesis notes",
      `- Palette: ${entry.notes.palette.join(", ")}`,
      `- Strokes: ${entry.notes.strokeCount} · avg brush ${entry.notes.avgBrushSize.toFixed(1)}px`,
      `- Curve amplitude: ${entry.notes.curveAmplitude.toFixed(0)}px · blur ${entry.notes.blurRadius.toFixed(1)}px`,
      `- Detail strokes: ${entry.notes.detailStrokes} · ink marks: ${entry.notes.inkMarks}`,
      `- Deterministic hash: \`${entry.hash}\``,
      "",
    ].join("\n");
  });

  const readme = [
    "# Song DNA Visual Synthesizer — Proof",
    "",
    "Algorithmic artwork derived from Retroverse acoustic metrics.",
    "No AI image generation. No prompts. Deterministic per RVTR seed.",
    "",
    "## Summary",
    "",
    `- Songs rendered: **${results.length}**`,
    `- Determinism check (${first.metrics.rvtr}): **${deterministic ? "PASS" : "FAIL"}**`,
    `- Output: \`reports/song-dna-visual-synth/images/\``,
    "",
    "## Side-by-side comparison",
    "",
    comparisonNotes(results),
    "",
    ...sections,
    "## Reproduce",
    "",
    "```bash",
    "npm run research:song-dna-visual-synth",
    "```",
    "",
  ].join("\n");

  await writeFile(join(REPORT_DIR, "README.md"), readme, "utf8");
  console.log(`Report → reports/song-dna-visual-synth/README.md`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
