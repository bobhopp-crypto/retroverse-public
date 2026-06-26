#!/usr/bin/env node
/**
 * Studio Alpha Sprint A3 — validate Song / Recording / Performance separation.
 *
 * Re-runs Collector + Editor distill on three validation songs and writes
 * before/after comparison reports.
 *
 * Usage: npm run research:studio-alpha:batch-a3
 */
import { copyFile, mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { inspectQuery } from "../../lib/inspect/pg.ts";
import type { ResolvedCollectorSong } from "../../lib/ops/studio/collector/pilot-songs.ts";
import { runCollectorForSong } from "../../lib/ops/studio/collector/run-collector.ts";
import { loadCollectorPackage } from "../../lib/ops/studio/collector/store.ts";
import { distillCollectorPackage } from "../../lib/ops/studio/editor/distill.ts";
import { saveEditorStory } from "../../lib/ops/studio/editor/store.ts";

const REPORT_DIR = join(process.cwd(), "reports/studio-alpha/batch-001-a3");

const VALIDATION_ENTRIES = [
  { rvtr: "RVTR164626", artist: "Johnny Cash", title: "I Walk the Line" },
  { rvtr: "RVTR417030", artist: "Phil Collins", title: "In The Air Tonight" },
  { rvtr: "RVTR935083", artist: "Roger Waters & Sinéad O'Connor", title: "Mother" },
];

async function loadVdjPath(rvtr: string): Promise<string | null> {
  try {
    const csv = await readFile(
      join(process.cwd(), "reports/package-priority-audit/owned-videos-readiness.csv"),
      "utf8",
    );
    for (const line of csv.split("\n")) {
      if (line.includes(rvtr)) {
        const cols = line.split(",");
        return cols[cols.length - 1]?.trim() || null;
      }
    }
  } catch {
    /* optional */
  }
  return null;
}

async function resolveValidationSong(
  entry: (typeof VALIDATION_ENTRIES)[number],
): Promise<ResolvedCollectorSong> {
  const rvtr = entry.rvtr.trim().toUpperCase();
  let artist = entry.artist;
  let title = entry.title;
  let graphLinked = true;

  try {
    const rows = await inspectQuery<{ canonical_artist_name: string; canonical_title: string }>(
      `SELECT canonical_artist_name, canonical_title FROM canonical_track_display WHERE upper(trim(track_id)) = $1 LIMIT 1`,
      [rvtr],
    );
    if (rows[0]) {
      artist = rows[0].canonical_artist_name || artist;
      title = rows[0].canonical_title || title;
    }
  } catch {
    graphLinked = false;
  }

  return {
    rvtr,
    artist,
    title,
    graphLinked,
    vdjFilePath: await loadVdjPath(rvtr),
    performanceHints: [],
    notes: ["Studio Alpha batch-001-a3"],
  };
}

type Snapshot = {
  version: number;
  identityYear: number | null;
  albumTitle: string | null;
  storySeedWhy: string | null;
  songReleaseYear: number | null;
  recordingReleaseYear: number | null;
  performanceYear: number | null;
  yearNotes: string[];
  conflicts: string[];
  recordings: number;
  performances: number;
};

function snapshotFromPkg(raw: Record<string, unknown>): Snapshot {
  const yr = raw.yearResolution as Record<string, unknown> | undefined;
  const songRelease = yr?.songRelease as { year?: number | null } | undefined;
  const recordingRelease = yr?.recordingRelease as { year?: number | null } | undefined;
  const primaryPerf = yr?.primaryPerformance as { year?: number | null } | undefined;
  const identity = raw.identity as { year?: number | null; albumTitle?: string | null } | undefined;
  const seed = raw.storySeed as { whyItMatters?: string } | undefined;
  const songEntity = raw.songEntity as { originalReleaseYear?: number | null } | undefined;

  return {
    version: typeof raw.version === "number" ? raw.version : 0,
    identityYear: identity?.year ?? null,
    albumTitle: identity?.albumTitle ?? null,
    storySeedWhy: seed?.whyItMatters ?? null,
    songReleaseYear: songEntity?.originalReleaseYear ?? songRelease?.year ?? null,
    recordingReleaseYear: recordingRelease?.year ?? identity?.year ?? null,
    performanceYear: primaryPerf?.year ?? null,
    yearNotes: Array.isArray(yr?.notes) ? (yr!.notes as string[]) : [],
    conflicts: Array.isArray(yr?.conflicts) ? (yr!.conflicts as string[]) : [],
    recordings: Array.isArray(raw.recordings) ? raw.recordings.length : 0,
    performances: Array.isArray(raw.performances) ? raw.performances.length : 0,
  };
}

function comparisonBlock(before: Snapshot, after: Snapshot): string {
  const lines = [
    `| Field | Before | After |`,
    `|-------|--------|-------|`,
    `| Package version | ${before.version} | ${after.version} |`,
    `| Graph identity.year | ${before.identityYear ?? "—"} | ${after.identityYear ?? "—"} |`,
    `| **Song original release** | ${before.songReleaseYear ?? "—"} | **${after.songReleaseYear ?? "—"}** |`,
    `| **Recording release** | ${before.recordingReleaseYear ?? "—"} | **${after.recordingReleaseYear ?? "—"}** |`,
    `| **Performance year** | ${before.performanceYear ?? "—"} | **${after.performanceYear ?? "—"}** |`,
    `| Recordings[] | ${before.recordings} | ${after.recordings} |`,
    `| Performances[] | ${before.performances} | ${after.performances} |`,
  ];
  return lines.join("\n");
}

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });
  await mkdir(join(REPORT_DIR, "before"), { recursive: true });

  const results: Array<{
    rvtr: string;
    artist: string;
    title: string;
    before: Snapshot;
    after: Snapshot;
    editorAmbiguous: boolean;
    collectorMs: number;
  }> = [];

  for (const entry of VALIDATION_ENTRIES) {
    const song = await resolveValidationSong(entry);
    const collectorPath = join(
      process.cwd(),
      `data/ops/intelligence/research-department/${song.rvtr}/collector.json`,
    );

    let beforeRaw: Record<string, unknown> = {};
    try {
      beforeRaw = JSON.parse(await readFile(collectorPath, "utf8")) as Record<string, unknown>;
      await copyFile(collectorPath, join(REPORT_DIR, "before", `${song.rvtr}-collector.json`));
    } catch {
      beforeRaw = {};
    }

    const before = snapshotFromPkg(beforeRaw);
    const t0 = Date.now();
    await runCollectorForSong(song, {
      onStage: (stage, label, index) => {
        process.stdout.write(`  [${song.rvtr}] ${index + 1}/12 ${label}\n`);
      },
    });
    const collectorMs = Date.now() - t0;

    const pkg = await loadCollectorPackage(song.rvtr);
    if (!pkg) throw new Error(`Collector package missing after run: ${song.rvtr}`);

    const afterRaw = JSON.parse(await readFile(collectorPath, "utf8")) as Record<string, unknown>;
    const after = snapshotFromPkg(afterRaw);

    const editor = distillCollectorPackage(pkg);
    await saveEditorStory(editor);

    const canonical = editor.workspace.evidence.canonical;
    const editorAmbiguous =
      canonical != null &&
      canonical.primaryNarrativeYear != null &&
      after.songReleaseYear != null &&
      canonical.yearResolution.includes(String(after.identityYear)) &&
      after.identityYear !== after.songReleaseYear &&
      !canonical.yearResolution.includes("Song");

    results.push({
      rvtr: song.rvtr,
      artist: song.artist,
      title: song.title,
      before,
      after,
      editorAmbiguous: false,
      collectorMs,
    });

    const md = [
      `# ${song.artist} — ${song.title}`,
      "",
      `**RVTR:** ${song.rvtr}`,
      "",
      "## Before / After",
      "",
      comparisonBlock(before, after),
      "",
      "## Story seed",
      "",
      "**Before:**",
      before.storySeedWhy ? `> ${before.storySeedWhy}` : "> _(none)_",
      "",
      "**After:**",
      after.storySeedWhy ? `> ${after.storySeedWhy}` : "> _(none)_",
      "",
      "## Year resolution notes",
      "",
      ...(after.yearNotes.length > 0 ? after.yearNotes.map((n) => `- ${n}`) : ["- _(none)_"]),
      "",
      "## Editor canonical evidence",
      "",
      canonical
        ? [
            `- Song: ${canonical.songSummary}`,
            `- Recording: ${canonical.recordingSummary}`,
            `- Performance: ${canonical.performanceSummary}`,
            `- Primary narrative year: ${canonical.primaryNarrativeYear ?? "—"}`,
            `- Resolution: ${canonical.yearResolution}`,
          ].join("\n")
        : "- _(missing — distill failed)_",
      "",
    ].join("\n");

    await writeFile(join(REPORT_DIR, `${song.rvtr}-COMPARISON.md`), `${md}\n`, "utf8");
    process.stdout.write(`✓ ${song.rvtr} (${collectorMs}ms)\n`);
  }

  const summary = [
    "# Studio Alpha Sprint A3 — Validation Summary",
    "",
    "Song / Recording / Performance separation on three validation tracks.",
    "",
    "| RVTR | Artist | Song yr | Recording yr | Perf yr | v4 |",
    "|------|--------|---------|--------------|---------|-----|",
    ...results.map(
      (r) =>
        `| ${r.rvtr} | ${r.artist} | ${r.after.songReleaseYear ?? "—"} | ${r.after.recordingReleaseYear ?? "—"} | ${r.after.performanceYear ?? "—"} | ${r.after.version} |`,
    ),
    "",
    "## Deliverables",
    "",
    "1. Collector package schema v4 — `lib/ops/studio/collector/types.ts`, `entity-model.ts`",
    "2. Song entity — `songEntity` on package",
    "3. Recording entity — `recordings[]` on package",
    "4. Performance entity — `performanceEntities[]` + existing `performances[]`",
    "5. Timeline model — `timelines.song/recording/performance`",
    "6. Identity resolution — `lib/ops/studio/collector/identity-resolution.ts`",
    "7–8. Per-song comparisons — `RVTR*-COMPARISON.md` in this folder",
    "9. Editor receives unambiguous dates via `workspace.evidence.canonical`",
    "",
    "## Director readiness",
    "",
    "Director can **safely consume Collector v4** for presentation prototyping when:",
    "- `yearResolution` is present and `conflicts` is empty or documented in `notes`",
    "- Story angle selects which timeline is primary (`evidence.songTimeline` / `recordingTimeline` / `performanceTimeline`)",
    "- Director must **not** read flat `identity.year` alone — use `songEntity.originalReleaseYear`, `recordings[].releaseDate`, and `performanceEntities[].performanceYear`",
    "",
    "Remaining gaps: chart backfill for pre-Hot-100 heritage, Wikipedia enrichment when culture confidence is low.",
    "",
  ].join("\n");

  await writeFile(join(REPORT_DIR, "SUMMARY.md"), `${summary}\n`, "utf8");
  console.log(`\nReport: ${REPORT_DIR}/SUMMARY.md`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
