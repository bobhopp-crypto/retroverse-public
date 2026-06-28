#!/usr/bin/env node
/**
 * Song DNA Proof of Concept — real Retroverse acoustic data, layered renderer.
 *
 * Usage: npm run research:song-dna-proof
 */
require("../finance/preload-server-only.cjs");

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { renderLayeredSongDna, renderLayeredSongDnaHash } from "../../lib/research/song-dna-proof/layered-renderer.ts";
import { composeMontage, renderSvgToPng } from "../../lib/research/song-dna-proof/render-png.ts";
import { loadAcousticMetrics } from "../../lib/research/song-dna-visual-synth/load-acoustic-metrics.ts";
import type { AcousticMetrics } from "../../lib/research/song-dna-visual-synth/types.ts";

const REPORT_DIR = join(process.cwd(), "reports/song-dna-proof");
const IMAGE_DIR = join(REPORT_DIR, "images");

const KEY_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

type ProofSong = {
  rvtr: string;
  label: string;
  imageFile: string;
  /** When set, Relax (or other) was unavailable — substitute used. */
  substituteNote?: string;
};

const PROOF_SONGS: ProofSong[] = [
  { rvtr: "RVTR569927", label: "Fleetwood Mac — Dreams", imageFile: "Dreams.png" },
  { rvtr: "RVTR573791", label: "Michael Jackson — Billie Jean", imageFile: "BillieJean.png" },
  { rvtr: "RVTR828046", label: "AC/DC — Back In Black", imageFile: "BackInBlack.png" },
  {
    rvtr: "RVTR734474",
    label: "Simon & Garfunkel — The Sound of Silence",
    imageFile: "SoundOfSilence.png",
  },
  {
    rvtr: "RVTR481591",
    label: "Frankie Goes To Hollywood — Relax (substituted: Eurythmics — Sweet Dreams)",
    imageFile: "Relax.png",
    substituteNote:
      "Relax (RVTR758008) has no acoustic metrics in Retroverse staging or canonical_album_track_display. Substituted **Eurythmics — Sweet Dreams Are Made Of This** (RVTR481591) — complete acoustic row.",
  },
];

function formatKey(metrics: AcousticMetrics): string {
  if (metrics.key == null || metrics.key < 0 || metrics.key > 11) return "—";
  return KEY_NAMES[metrics.key]!;
}

function formatMode(metrics: AcousticMetrics): string {
  if (metrics.mode === 1) return "major";
  if (metrics.mode === 0) return "minor";
  return "—";
}

function metricsTable(metrics: AcousticMetrics): string {
  return [
    "| Metric | Value |",
    "|---|---|",
    `| RVTR | ${metrics.rvtr} |`,
    `| Source | ${metrics.source} |`,
    `| Danceability | ${metrics.danceability.toFixed(4)} |`,
    `| Energy | ${metrics.energy.toFixed(4)} |`,
    `| Valence | ${metrics.valence.toFixed(4)} |`,
    `| Acousticness | ${metrics.acousticness.toFixed(4)} |`,
    `| Instrumentalness | ${metrics.instrumentalness.toFixed(6)} |`,
    `| Speechiness | ${metrics.speechiness.toFixed(4)} |`,
    `| Liveness | ${metrics.liveness.toFixed(4)} |`,
    `| Tempo (BPM) | ${metrics.tempo.toFixed(2)} |`,
    `| Loudness (dB) | ${metrics.loudness.toFixed(2)} |`,
    `| Key | ${formatKey(metrics)} |`,
    `| Mode | ${formatMode(metrics)} |`,
    `| Time Signature | ${metrics.timeSignature ?? "—"} |`,
  ].join("\n");
}

function masterMetricsTable(rows: Array<{ label: string; metrics: AcousticMetrics }>): string {
  const header = [
    "| Song | Danceability | Energy | Valence | Acousticness | Instrumentalness | Speechiness | Liveness | Tempo | Loudness | Key | Mode | Time Sig |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---:|",
  ];

  for (const { label, metrics } of rows) {
    header.push(
      `| ${label} | ${metrics.danceability.toFixed(3)} | ${metrics.energy.toFixed(3)} | ${metrics.valence.toFixed(3)} | ${metrics.acousticness.toFixed(3)} | ${metrics.instrumentalness.toFixed(5)} | ${metrics.speechiness.toFixed(3)} | ${metrics.liveness.toFixed(3)} | ${metrics.tempo.toFixed(1)} | ${metrics.loudness.toFixed(2)} | ${formatKey(metrics)} | ${formatMode(metrics)} | ${metrics.timeSignature ?? "—"} |`,
    );
  }

  return header.join("\n");
}

function layerReport(metrics: AcousticMetrics, effects: ReturnType<typeof renderLayeredSongDna>["layerEffects"]): string {
  const lines = effects.map(
    (e) => `**${e.layer}** (${e.metric} ${e.value})\n→ ${e.effect}`,
  );
  return lines.join("\n\n");
}

function comparisonSummary(rows: Array<{ label: string; metrics: AcousticMetrics }>): string {
  const byValence = [...rows].sort((a, b) => b.metrics.valence - a.metrics.valence);
  const byEnergy = [...rows].sort((a, b) => b.metrics.energy - a.metrics.energy);
  const byAcoustic = [...rows].sort((a, b) => b.metrics.acousticness - a.metrics.acousticness);
  const byLiveness = [...rows].sort((a, b) => b.metrics.liveness - a.metrics.liveness);

  return [
    "### Visual identity spread (acoustic-only)",
    "",
    `- **Brightest valence wash:** ${byValence[0]!.label} (${byValence[0]!.metrics.valence.toFixed(3)})`,
    `- **Darkest valence wash:** ${byValence[byValence.length - 1]!.label} (${byValence[byValence.length - 1]!.metrics.valence.toFixed(3)})`,
    `- **Heaviest brush field:** ${byEnergy[0]!.label} (${byEnergy[0]!.metrics.energy.toFixed(3)})`,
    `- **Most watercolor diffusion:** ${byAcoustic[0]!.label} (${byAcoustic[0]!.metrics.acousticness.toFixed(3)})`,
    `- **Most splatter:** ${byLiveness[0]!.label} (${byLiveness[0]!.metrics.liveness.toFixed(3)})`,
    "",
    "Each song maps the same 10-layer stack; metric deltas should produce distinguishable silhouettes without AI or prompts.",
  ].join("\n");
}

async function main() {
  await mkdir(IMAGE_DIR, { recursive: true });

  const results: Array<{
    song: ProofSong;
    metrics: AcousticMetrics;
    hash: string;
    layerEffects: ReturnType<typeof renderLayeredSongDna>["layerEffects"];
    png: Buffer;
  }> = [];

  for (const song of PROOF_SONGS) {
    const metrics = await loadAcousticMetrics(song.rvtr);
    if (!metrics) {
      console.error(`Missing metrics for ${song.rvtr} (${song.label})`);
      process.exit(1);
    }

    const first = renderLayeredSongDna(metrics);
    const second = renderLayeredSongDna(metrics);
    const hash = renderLayeredSongDnaHash(metrics);

    if (first.svg !== second.svg) {
      console.error(`Determinism FAIL for ${song.rvtr}`);
      process.exit(1);
    }

    const png = await renderSvgToPng(first.svg);
    await writeFile(join(IMAGE_DIR, song.imageFile), png);
    await writeFile(join(IMAGE_DIR, song.imageFile.replace(/\.png$/, ".svg")), first.svg, "utf8");

    results.push({ song, metrics, hash, layerEffects: first.layerEffects, png });
    console.log(`✓ ${song.label} → images/${song.imageFile} (${hash})`);
  }

  const montage = await composeMontage(results.map((r) => r.png));
  await writeFile(join(IMAGE_DIR, "montage-five-songs.png"), montage);

  const firstHash = results[0]!.hash;
  const deterministic = renderLayeredSongDnaHash(results[0]!.metrics) === firstHash;

  const sections = results.map(({ song, metrics, hash, layerEffects }) => {
    const sub = song.substituteNote ? `\n\n> **Substitute note:** ${song.substituteNote}\n` : "";
    return [
      `## ${song.label}`,
      sub,
      "### Acoustic metrics (Retroverse source)",
      "",
      metricsTable(metrics),
      "",
      `![${song.label}](images/${song.imageFile})`,
      "",
      "### Layer-by-layer — how metrics shaped the artwork",
      "",
      layerReport(metrics, layerEffects),
      "",
      `- Deterministic hash: \`${hash}\``,
      "",
    ].join("\n");
  });

  const readme = [
    "# Song DNA Proof of Concept — Real Acoustic Data",
    "",
    "Standalone experiment. Algorithmic layered PNGs from Retroverse acoustic metrics only.",
    "**No AI imagery. No prompts. No Spotify online.** RVTR seeds deterministic output.",
    "",
    "## Step 1 — Master metrics table",
    "",
    masterMetricsTable(results.map((r) => ({ label: r.song.label, metrics: r.metrics }))),
    "",
    "## Step 5 — Five-song montage",
    "",
    "![Montage](images/montage-five-songs.png)",
    "",
    comparisonSummary(results.map((r) => ({ label: r.song.label, metrics: r.metrics }))),
    "",
    "## Summary",
    "",
    `- Songs rendered: **${results.length}**`,
    `- Determinism check: **${deterministic ? "PASS" : "FAIL"}**`,
    `- Output: \`reports/song-dna-proof/images/\``,
    "",
    "### Layer stack (bottom → top)",
    "",
    "1. Black background",
    "2. Canvas texture ← Instrumentalness",
    "3. Glow ← Loudness",
    "4. Color wash ← Valence",
    "5. Harmonic watercolor blooms ← Acousticness",
    "6. Primary brush field ← Energy",
    "7. Motion ribbons ← Danceability + Tempo",
    "8. Splatter ← Liveness",
    "9. Fine detail ← Speechiness",
    "10. Signature highlights ← Key + Mode",
    "",
    ...sections,
    "## Reproduce",
    "",
    "```bash",
    "npm run research:song-dna-proof",
    "```",
    "",
  ].join("\n");

  await writeFile(join(REPORT_DIR, "README.md"), readme, "utf8");
  console.log("Report → reports/song-dna-proof/README.md");
  console.log("Montage → reports/song-dna-proof/images/montage-five-songs.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
