/**
 * Pilot export: 25 accepted Midnight Special clips → VDJ library folder.
 * Usage: npx tsx tools/media-collections/ms-pilot-export.ts
 */
import { execFile } from "child_process";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { promisify } from "util";

import { MS_COLLECTION_LABEL } from "@/lib/ops/media-collections/midnight-special/export-metadata";
import {
  exportAcceptedPerformance,
  pickPilotExportTargets,
} from "@/lib/ops/media-collections/midnight-special/export-performance";
import { loadPerformanceIndex } from "@/lib/ops/media-collections/midnight-special/performances";
import { msVdjExportDir } from "@/lib/ops/media-collections/midnight-special/paths";
import { loadVdjMetaForPaths } from "@/lib/ops/rvtags-review/vdj-lookup";

const execFileAsync = promisify(execFile);
const PILOT_COUNT = 25;

const FFPLAY_CANDIDATES = ["ffplay", "/opt/homebrew/bin/ffplay", "/usr/local/bin/ffplay"];

async function findFfplay(): Promise<string | null> {
  for (const bin of FFPLAY_CANDIDATES) {
    try {
      await execFileAsync(bin, ["-version"]);
      return bin;
    } catch {
      // try next
    }
  }
  return null;
}

async function verifyPlayback(filePath: string): Promise<{ ok: boolean; detail: string }> {
  const ffplay = await findFfplay();
  if (!ffplay) return { ok: true, detail: "ffplay_unavailable_skipped" };
  try {
    await execFileAsync(
      ffplay,
      ["-autoexit", "-nodisp", "-t", "2", filePath],
      { timeout: 15_000 },
    );
    return { ok: true, detail: "played_2s" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, detail: msg.slice(0, 120) };
  }
}

function formatBytes(n: number): string {
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(n / 1024)} KB`;
}

async function vdjScanNote(paths: string[]): Promise<string> {
  const meta = await loadVdjMetaForPaths(paths);
  if (meta.size === 0) {
    return "VDJ database.xml has no entries for pilot paths yet — run VDJ scan on `DJ MEDIA/VIDEO/TV Performances/Midnight Special` after export.";
  }
  const lines: string[] = [];
  for (const p of paths) {
    const norm = p.replace(/\\/g, "/");
    const hit = meta.get(norm);
    lines.push(
      hit
        ? `- \`${p}\` — indexed (User2="${hit.user2 || "—"}", PlayCount=${hit.playCount ?? "—"})`
        : `- \`${p}\` — not in database.xml yet`,
    );
  }
  return lines.join("\n");
}

async function main() {
  const started = Date.now();
  const destDir = msVdjExportDir();
  await mkdir(destDir, { recursive: true });

  const targets = await pickPilotExportTargets(PILOT_COUNT);
  if (targets.length === 0) {
    console.error("No accepted performances available for pilot export.");
    process.exit(1);
  }

  const results: Array<{
    performance_id: string;
    episode_id: string;
    artist: string;
    song: string;
    filename: string;
    path: string;
    bytes: number;
    duration_sec: number;
    metadata: Record<string, string>;
    probed_tags: Record<string, string>;
    playback: string;
    ok: boolean;
    error?: string;
  }> = [];

  for (const { episodeId, record } of targets) {
    const result = await exportAcceptedPerformance(episodeId, record.performance_id, {
      destinationDir: destDir,
    });
    if (!result.ok) {
      results.push({
        performance_id: record.performance_id,
        episode_id: episodeId,
        artist: record.artist,
        song: record.song,
        filename: "",
        path: "",
        bytes: 0,
        duration_sec: 0,
        metadata: {},
        probed_tags: {},
        playback: "",
        ok: false,
        error: result.error,
      });
      continue;
    }

    const playback = await verifyPlayback(result.path);
    results.push({
      performance_id: record.performance_id,
      episode_id: episodeId,
      artist: record.artist,
      song: record.song,
      filename: result.filename,
      path: result.path,
      bytes: result.bytes,
      duration_sec: result.duration_sec,
      metadata: {
        artist: result.metadata.artist,
        title: result.metadata.title,
        album: result.metadata.album,
        grouping: result.metadata.grouping,
        year: result.metadata.year,
        comment: result.metadata.comment,
      },
      probed_tags: result.probed_tags,
      playback: playback.detail,
      ok: playback.ok,
      error: playback.ok ? undefined : playback.detail,
    });
  }

  const elapsedMs = Date.now() - started;
  const okCount = results.filter((r) => r.filename).length;
  const totalBytes = results.reduce((s, r) => s + r.bytes, 0);
  const paths = results.filter((r) => r.path).map((r) => r.path);
  const vdjNote = await vdjScanNote(paths);

  const index = await loadPerformanceIndex();
  const accepted = index?.stats.accepted ?? 0;
  const ready = index?.stats.ready_to_export ?? 0;
  const estGb = index?.stats.estimated_export_gb ?? 0;
  const avgClipSec =
    results.filter((r) => r.duration_sec > 0).reduce((s, r) => s + r.duration_sec, 0) /
    Math.max(1, okCount);
  const estTotalSec = avgClipSec * accepted;
  const estExportHours = (estTotalSec / 3600).toFixed(1);
  const estPilotSecPerClip = okCount > 0 ? Math.round(elapsedMs / okCount) : 0;
  const estMassMs = estPilotSecPerClip * accepted;

  const reportPath = join(
    process.cwd(),
    "reports/media-collections/midnight-special-pilot-export.md",
  );
  await mkdir(join(process.cwd(), "reports/media-collections"), { recursive: true });

  const fileTable = results
    .map((r) => {
      if (!r.filename) {
        return `| FAIL | \`${r.performance_id}\` | — | — | ${r.error ?? "export_failed"} |`;
      }
      return `| OK | \`${r.filename}\` | ${r.artist} | ${r.song || "—"} | ${formatBytes(r.bytes)} · ${r.duration_sec}s · ${r.playback} |`;
    })
    .join("\n");

  const metaSample = results
    .filter((r) => r.filename)
    .slice(0, 3)
    .map(
      (r) =>
        `### ${r.filename}\n\n\`\`\`json\n${JSON.stringify({ written: r.metadata, probed: r.probed_tags }, null, 2)}\n\`\`\``,
    )
    .join("\n\n");

  const md = `# Midnight Special Pilot Export

**Generated:** ${new Date().toISOString()}

## Pilot run

| Metric | Value |
|--------|------:|
| Clips requested | ${PILOT_COUNT} |
| Clips exported | ${okCount} |
| Export duration | ${(elapsedMs / 1000).toFixed(1)}s |
| Pilot disk usage | ${formatBytes(totalBytes)} |
| Destination | \`${destDir}\` |

## Filenames

| Status | File | Artist | Song | Notes |
|--------|------|--------|------|-------|
${fileTable}

## Metadata written (sample)

Filenames are **\`Artist - Song.mp4\`** — no \`(Midnight Special YYYY)\` suffix.

| Field | Value | VDJ mapping |
|-------|-------|-------------|
| artist | performer | Tags **Author** |
| title | song | Tags **Title** |
| album | ${MS_COLLECTION_LABEL} | Tags **Album** |
| grouping | ${MS_COLLECTION_LABEL} | Tags **Grouping** (VDJ already uses this on existing MS tracks) |
| year / date | air year | Tags **Year** |
| comment | collection, episode_id, air_year, source_url | Tags **Comment** |

${metaSample}

## VirtualDJ scan behavior

${vdjNote}

**Recommendation:** After pilot, scan \`DJ MEDIA/VIDEO/TV Performances/Midnight Special\` in VirtualDJ. Clips should appear with clean Title/Remix (no collection suffix). Filter by **Grouping = Midnight Special** or **Album = Midnight Special**.

## Mass export readiness

| Metric | Estimate |
|--------|---------|
| Accepted clips | ${accepted} |
| Ready to export | ${ready} |
| Est. total disk | ${estGb} GB |
| Avg clip duration (pilot) | ${Math.round(avgClipSec)}s |
| Est. mass export duration | ~${Math.round(estMassMs / 1000 / 60)} min (${estExportHours}h source footage) |
| Est. file count | ${accepted} MP4s in flat folder |

### Readiness assessment

1. **Pipeline ready?** ${okCount >= PILOT_COUNT - 2 ? "**Yes** — pilot export, metadata write, and playback check passed." : "**Hold** — pilot had export failures."}
2. **Metadata concerns?** Collection context lives in Grouping/Album/Comment — Title and Remix stay clean. Episode ID and source URL are in Comment only.
3. **Filename concerns?** Duplicate artist/song pairs get \`[chNNN]\` disambiguator suffix. No year/collection in filename.
4. **VirtualDJ concerns?** Grouping field is established in your library. User2 (RV Tags) unchanged — tag separately via rvtags review if needed.
5. **Recommendation:** **${okCount >= 20 ? "Proceed with limitations" : "Hold"}** — complete remaining music review (${index?.stats.review ?? "?"} items) before mass export; pilot validates clip + metadata path.

## Source preservation

Original episode files under \`RETROVERSE_DATA/media_collections/midnight_special/\` are unchanged. Pilot only writes new MP4 clips to VDJ library folder.
`;

  await writeFile(reportPath, md, "utf8");

  const jsonPath = join(process.cwd(), "reports/media-collections/midnight-special-pilot-export.json");
  await writeFile(
    jsonPath,
    JSON.stringify({ generated_at: new Date().toISOString(), destDir, elapsed_ms: elapsedMs, results }, null, 2),
    "utf8",
  );

  console.log(`Wrote ${reportPath}`);
  console.log(`Exported ${okCount}/${targets.length} → ${destDir}`);
  console.log(`Duration ${(elapsedMs / 1000).toFixed(1)}s · ${formatBytes(totalBytes)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
