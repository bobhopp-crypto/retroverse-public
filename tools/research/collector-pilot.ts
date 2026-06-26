#!/usr/bin/env node
/**
 * Retroverse Studio — Collector pilot batch (3 songs).
 * Writes collector.json per song and updates live dashboard progress.
 */
import {
  COLLECTOR_PILOT_SONGS,
  resolveCollectorPilotSong,
} from "../../lib/ops/studio/collector/pilot-songs";
import {
  markCollectorIdle,
  markCollectorWaiting,
  recordCollectorCompletion,
  runCollectorForSong,
} from "../../lib/ops/studio/collector/run-collector";
import {
  emptyCollectorProgress,
  loadCollectorProgress,
  saveCollectorProgress,
} from "../../lib/ops/studio/collector/store";
import { COLLECTOR_STAGE_TOTAL } from "../../lib/ops/studio/collector/types";
import { writeCollectorPilotReport } from "../../lib/ops/studio/collector/write-pilot-report";

async function main() {
  const resolvedSongs = [];
  for (const pilot of COLLECTOR_PILOT_SONGS) {
    resolvedSongs.push(await resolveCollectorPilotSong(pilot));
  }

  const progress = emptyCollectorProgress();
  progress.status = "researching";
  progress.startedAt = new Date().toISOString();
  progress.queue = resolvedSongs.length;
  progress.stageTotal = COLLECTOR_STAGE_TOTAL;
  await saveCollectorProgress(progress);

  const packages = [];

  for (let index = 0; index < resolvedSongs.length; index++) {
    const resolved = resolvedSongs[index]!;
    const remaining = resolvedSongs.length - index - 1;
    const started = Date.now();

    console.log(`\n[Collector] ${index + 1}/${resolvedSongs.length} — ${resolved.artist} — ${resolved.title}`);
    console.log(`  RVTR: ${resolved.rvtr}${resolved.graphLinked ? "" : " (VDJ-only)"}`);

    const currentProgress = await loadCollectorProgress();
    currentProgress.queue = remaining;
    currentProgress.currentSong = {
      rvtr: resolved.rvtr,
      artist: resolved.artist,
      title: resolved.title,
    };
    await saveCollectorProgress(currentProgress);

    const pkg = await runCollectorForSong(resolved, {
      onStage: async (stageId, label, stageIndex) => {
        console.log(`  [${stageIndex}/${COLLECTOR_STAGE_TOTAL}] ${label}`);
        const live = await loadCollectorProgress();
        live.currentStage = stageId;
        live.currentStageLabel = label;
        live.stageIndex = stageIndex;
        await saveCollectorProgress(live);
      },
    });

    const runtimeMs = Date.now() - started;
    packages.push(pkg);

    await recordCollectorCompletion({
      rvtr: pkg.rvtr,
      artist: pkg.artist,
      title: pkg.title,
      researchQuality: pkg.researchQuality,
      runtimeMs,
    });

    if (remaining > 0) {
      await markCollectorWaiting(remaining);
    }

    console.log(`  ✓ Research quality ${pkg.researchQuality}% · ${runtimeMs}ms`);
    console.log(`  → data/ops/intelligence/research-department/${pkg.rvtr}/collector.json`);
  }

  await markCollectorIdle();
  const finalProgress = await loadCollectorProgress();
  finalProgress.status = "complete";
  finalProgress.queue = 0;
  await saveCollectorProgress(finalProgress);

  const reportPath = await writeCollectorPilotReport(packages);
  console.log(`\n[Collector] Pilot complete — ${packages.length} songs`);
  console.log(`  Report: ${reportPath}`);
  console.log("  Dashboard: /ops/studio/collector");
}

main().catch(async (err) => {
  console.error("[Collector] Pilot failed:", err instanceof Error ? err.message : err);
  try {
    const progress = await loadCollectorProgress();
    progress.status = "idle";
    await saveCollectorProgress(progress);
  } catch {
    /* ignore */
  }
  process.exit(1);
});
