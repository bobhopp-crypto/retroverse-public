/**
 * Ollama Experience Director — 10 song pilot batch.
 *
 * Usage: npm run experience:director:pilot
 */
require("../finance/preload-server-only.cjs");

import { inspectPing } from "../../lib/inspect/pg";

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) {
    console.error(`Postgres unavailable: ${ping.error ?? "unknown"}`);
    process.exit(1);
  }

  const { selectPilotSongs, assembleDirectorInput } = await import(
    "../../lib/ops/intelligence/ollama-experience-director/select-pilot-songs.ts"
  );
  const { runDirectorForSong } = await import(
    "../../lib/ops/intelligence/ollama-experience-director/run-director.ts"
  );
  const { bundledDirectorPilotOutputPath, writeDirectorOutputs, writePilotReport, writeSelectedSongs } =
    await import(
      "../../lib/ops/intelligence/ollama-experience-director/write-director-output.ts"
    );
  const { ollamaAvailable, intelligenceModel } = await import(
    "../../lib/ops/intelligence/ollama-client.ts"
  );
  const { existsSync } = await import("node:fs");

  const missingOnly = process.argv.includes("--missing-only");

  console.log("Experience Director Pilot — selecting 10 songs…");
  const selection = await selectPilotSongs(10);
  const selectedPath = await writeSelectedSongs(selection);
  console.log(`Selected ${selection.count} songs → ${selectedPath}`);
  for (const song of selection.songs) {
    console.log(
      `  ${song.rvtr} | ${song.artist} — ${song.title} | plays ${song.playCount} | tier ${song.packageQualityTier}`,
    );
  }

  const ollamaOk = await ollamaAvailable();
  if (!ollamaOk) {
    console.error("\nOllama not available — selected songs saved, director not run.");
    console.error("Start Ollama: ollama serve");
    process.exit(1);
  }
  console.log(`\nOllama ready (${intelligenceModel()}) — running director…`);

  const inputs = [];
  for (const song of selection.songs) {
    if (missingOnly && existsSync(bundledDirectorPilotOutputPath(song.rvtr))) {
      console.log(`  skip ${song.rvtr} (output exists)`);
      continue;
    }
    inputs.push(await assembleDirectorInput(song));
  }

  const { buildDirectorResultsFromDisk } = await import(
    "../../lib/ops/intelligence/ollama-experience-director/load-director-pilot.ts"
  );

  if (inputs.length === 0) {
    console.log("\nAll songs already have director output.");
    const allResults = await buildDirectorResultsFromDisk(selection);
    const reportPath = await writePilotReport(selection, allResults);
    console.log(`Report: ${reportPath}`);
    return;
  }

  for (const input of inputs) {
    console.log(`  Director: ${input.artist} — ${input.title} (${input.rvtr})`);
    const result = await runDirectorForSong(input);
    if (result.ok && result.output) {
      await writeDirectorOutputs([result.output]);
      console.log(`    → ${result.output.publicReadiness} | ${result.output.chapters.length} chapters`);
    } else {
      console.error(`    ✗ ${result.error}`);
    }
  }

  const allResults = await buildDirectorResultsFromDisk(selection);
  const reportPath = await writePilotReport(selection, allResults);

  const outputs = allResults.filter((r) => r.output).map((r) => r.output!);
  console.log(`\nDone.`);
  console.log(`  JSON files: ${outputs.length} / ${selection.count} → data/ops/intelligence/director-pilot/`);
  console.log(`  Report: ${reportPath}`);
  console.log(`  Review: /ops/experience-director-pilot`);

  const failed = allResults.filter((r) => !r.ok);
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
