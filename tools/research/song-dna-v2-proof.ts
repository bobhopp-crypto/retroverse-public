#!/usr/bin/env node
/**
 * Song DNA v2 — independent seeded engines prototype.
 *
 * Usage: npm run research:song-dna-v2
 */
require("../finance/preload-server-only.cjs");

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { loadAcousticMetrics } from "../../lib/research/song-dna-visual-synth/load-acoustic-metrics.ts";
import { composeMontage, renderSvgToPng } from "../../lib/research/song-dna-v2/render-png.ts";
import { renderSongDnaV2, renderSongDnaV2Hash } from "../../lib/research/song-dna-v2/render.ts";
import { hashSeed } from "../../lib/research/song-dna-v2/seeds.ts";

const REPORT_DIR = join(process.cwd(), "reports/song-dna-v2");

const SONGS = [
  { rvtr: "RVTR569927", label: "Fleetwood Mac — Dreams", slug: "Dreams" },
  { rvtr: "RVTR573791", label: "Michael Jackson — Billie Jean", slug: "BillieJean" },
  { rvtr: "RVTR828046", label: "AC/DC — Back In Black", slug: "BackInBlack" },
  { rvtr: "RVTR734474", label: "Simon & Garfunkel — The Sound of Silence", slug: "SoundOfSilence" },
  { rvtr: "RVTR481591", label: "Eurythmics — Sweet Dreams", slug: "SweetDreams" },
];

const STAGES = ["01-background", "02-rhythm", "03-particles", "04-lighting", "05-final"] as const;

function seedTable(rvtr: string): string {
  const domains = ["composition", "background", "brush", "rhythm", "particle", "lighting", "signature"] as const;
  const rows = domains.map((d) => `| ${d} | \`${hashSeed(rvtr, d).toString(16)}\` |`);
  return ["| Engine | Seed (hex) |", "|---|---|", ...rows].join("\n");
}

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });

  const finals: Buffer[] = [];
  const sections: string[] = [];

  for (const song of SONGS) {
    const metrics = await loadAcousticMetrics(song.rvtr);
    if (!metrics) {
      console.error(`Missing metrics: ${song.rvtr}`);
      process.exit(1);
    }

    const first = renderSongDnaV2(metrics);
    const hash = renderSongDnaV2Hash(metrics);
    const second = renderSongDnaV2(metrics);

    if (first.stages["05-final"] !== second.stages["05-final"]) {
      console.error(`Determinism FAIL: ${song.rvtr}`);
      process.exit(1);
    }

    const songDir = join(REPORT_DIR, song.slug);
    await mkdir(songDir, { recursive: true });

    for (const stage of STAGES) {
      const png = await renderSvgToPng(first.stages[stage]);
      const filename = `${stage}.png`;
      await writeFile(join(songDir, filename), png);
      await writeFile(join(songDir, `${stage}.svg`), first.stages[stage], "utf8");
    }

    const finalPng = await renderSvgToPng(first.stages["05-final"]);
    finals.push(finalPng);

    console.log(`✓ ${song.label} → ${song.slug}/ (${hash}) structure=${first.layers.layout.structure}`);

    sections.push(
      [
        `## ${song.label}`,
        "",
        `- RVTR: \`${metrics.rvtr}\``,
        `- Composition structure: **${["radial", "diagonal sweep", "spiral", "twin-arc"][first.layers.layout.structure]}**`,
        `- Final hash: \`${hash}\``,
        "",
        "### Engine seeds",
        "",
        seedTable(metrics.rvtr),
        "",
        "### Stage outputs",
        "",
        ...STAGES.map(
          (s) =>
            `- [${s}](${song.slug}/${s}.png)`,
        ),
        "",
        `![${song.label} final](${song.slug}/05-final.png)`,
        "",
      ].join("\n"),
    );
  }

  const montage = await composeMontage(finals);
  await writeFile(join(REPORT_DIR, "montage-finals.png"), montage);

  const readme = [
    "# Song DNA v2 — Independent Seeded Engines",
    "",
    "Experimental renderer — **does not modify** Song DNA v1 / proof renderers.",
    "",
    "Each engine uses its own deterministic seed: `hash(RVTR + domain)`.",
    "Spotify acoustic metrics **control** engine parameters only.",
    "",
    "## Songs",
    "",
    ...SONGS.map((s) => `- ${s.label} (\`${s.rvtr}\`) → \`${s.slug}/\``),
    "",
    "## Montage — five finals",
    "",
    "![Montage](montage-finals.png)",
    "",
    "## Layer stages (per song)",
    "",
    "1. `01-background` — atmosphere + void",
    "2. `02-rhythm` — + rhythm strokes",
    "3. `03-particles` — + sparks",
    "4. `04-lighting` — + halo + beams",
    "5. `05-final` — + composition arcs + signature",
    "",
    ...sections,
    "## Reproduce",
    "",
    "```bash",
    "npm run research:song-dna-v2",
    "```",
    "",
  ].join("\n");

  await writeFile(join(REPORT_DIR, "README.md"), readme, "utf8");
  console.log("Report → reports/song-dna-v2/README.md");
  console.log("Montage → reports/song-dna-v2/montage-finals.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
