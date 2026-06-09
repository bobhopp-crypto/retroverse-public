/**
 * Mass export all accepted Midnight Special performances.
 * Usage:
 *   npx tsx tools/media-collections/ms-mass-export.ts
 *   npx tsx tools/media-collections/ms-mass-export.ts --force
 */
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import {
  ensureExportManifest,
  manifestStats,
  saveExportManifest,
  upsertManifestEntry,
  type ExportManifestEntry,
} from "@/lib/ops/media-collections/midnight-special/export-manifest";
import { MS_COLLECTION_LABEL } from "@/lib/ops/media-collections/midnight-special/export-metadata";
import {
  exportAcceptedPerformance,
  listMassExportTargets,
  metadataMatchesExport,
  probeExportMetadata,
} from "@/lib/ops/media-collections/midnight-special/export-performance";
import { loadPerformanceIndex } from "@/lib/ops/media-collections/midnight-special/performances";
import { msExportManifestPath, msVdjExportDir } from "@/lib/ops/media-collections/midnight-special/paths";

function formatBytes(n: number): string {
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(n / 1024)} KB`;
}

async function main() {
  const force = process.argv.includes("--force");
  const started = Date.now();
  const destDir = msVdjExportDir();
  await mkdir(destDir, { recursive: true });

  const targets = await listMassExportTargets();
  const manifest = await ensureExportManifest(destDir);
  manifest.destination_dir = destDir;

  let exported = 0;
  let skipped = 0;
  let failed = 0;
  const failures: Array<{ performance_id: string; error: string }> = [];
  const samples: ExportManifestEntry[] = [];

  console.log(`Mass export: ${targets.length} accepted performances → ${destDir}`);
  if (force) console.log("Force mode: re-writing existing files.");

  for (let i = 0; i < targets.length; i++) {
    const record = targets[i]!;
    const result = await exportAcceptedPerformance(record.episode_id, record.performance_id, {
      destinationDir: destDir,
      force,
      record,
    });

    if (!result.ok) {
      failed += 1;
      failures.push({ performance_id: record.performance_id, error: result.error });
      upsertManifestEntry(manifest, {
        performance_id: record.performance_id,
        episode_id: record.episode_id,
        artist: record.artist,
        song: record.song,
        year: "",
        grouping: "",
        output_path: "",
        export_status: "failed",
        error: result.error,
      });
      await saveExportManifest(manifest);
      console.log(`[${i + 1}/${targets.length}] FAIL ${record.performance_id} — ${result.error}`);
      continue;
    }

    if (result.skipped) {
      skipped += 1;
      upsertManifestEntry(manifest, {
        performance_id: record.performance_id,
        episode_id: record.episode_id,
        artist: record.artist,
        song: record.song,
        year: result.metadata.year,
        grouping: result.metadata.grouping,
        output_path: result.path,
        export_status: "skipped",
        exported_at: new Date().toISOString(),
        bytes: result.bytes,
      });
      if ((i + 1) % 50 === 0) {
        console.log(`[${i + 1}/${targets.length}] skipped ${skipped}, exported ${exported}, failed ${failed}`);
      }
    } else {
      exported += 1;
      const entry: ExportManifestEntry = {
        performance_id: record.performance_id,
        episode_id: record.episode_id,
        artist: record.artist,
        song: record.song,
        year: result.metadata.year,
        grouping: result.metadata.grouping,
        output_path: result.path,
        export_status: "completed",
        exported_at: new Date().toISOString(),
        bytes: result.bytes,
      };
      upsertManifestEntry(manifest, entry);
      if (samples.length < 5) samples.push(entry);
      if (exported % 25 === 0 || i === targets.length - 1) {
        console.log(`[${i + 1}/${targets.length}] exported ${exported}, skipped ${skipped}, failed ${failed}`);
      }
    }

    if ((i + 1) % 10 === 0) await saveExportManifest(manifest);
  }

  await saveExportManifest(manifest);
  const elapsedMs = Date.now() - started;
  const stats = manifestStats(manifest);
  const index = await loadPerformanceIndex();

  const verifySamples = samples.slice(0, 3);
  const verified: Array<{ file: string; ok: boolean; tags: Record<string, string> }> = [];
  for (const s of verifySamples) {
    const tags = await probeExportMetadata(s.output_path);
    const ok = metadataMatchesExport(tags, {
      artist: s.artist,
      title: s.song,
      album: MS_COLLECTION_LABEL,
      grouping: s.grouping as never,
      year: s.year,
    });
    verified.push({ file: s.output_path.split("/").pop() ?? s.output_path, ok, tags });
  }

  const reportPath = join(
    process.cwd(),
    "reports/media-collections/midnight-special-mass-export.md",
  );
  await mkdir(join(process.cwd(), "reports/media-collections"), { recursive: true });

  const failureRows = failures
    .slice(0, 40)
    .map((f) => `| \`${f.performance_id}\` | ${f.error} |`)
    .join("\n");

  const sampleRows = samples
    .map(
      (s) =>
        `| \`${s.output_path.split("/").pop()}\` | ${s.artist} | ${s.song} | ${s.grouping} | ${s.year || "—"} |`,
    )
    .join("\n");

  const verifyBlock = verified
    .map(
      (v) =>
        `### ${v.file}\n\n- Metadata OK: **${v.ok ? "yes" : "no"}**\n\`\`\`json\n${JSON.stringify(v.tags, null, 2)}\n\`\`\``,
    )
    .join("\n\n");

  const md = `# Midnight Special Mass Export

**Generated:** ${new Date().toISOString()}

## Summary

| Metric | Value |
|--------|------:|
| Exportable accepted | ${targets.length} |
| Newly exported | ${exported} |
| Skipped (valid existing) | ${skipped} |
| Failed | ${failed} |
| Total runtime | ${(elapsedMs / 1000 / 60).toFixed(1)} min |
| Total disk (manifest) | ${formatBytes(stats.total_bytes)} |
| Destination | \`${destDir}\` |
| Manifest | \`${msExportManifestPath()}\` |

## Metadata strategy

| Field | Value |
|-------|-------|
| Artist | performer |
| Title | song |
| Album | ${MS_COLLECTION_LABEL} |
| Grouping | Performance / Comedy / Interview / Intro / Movie Clip / Commercial |
| Year | air year |

No Comment, episode_id, source_url, or youtube_id in file tags.

## Sample filenames

| File | Artist | Song | Grouping | Year |
|------|--------|------|----------|------|
${sampleRows || "| — | — | — | — | — |"}

## Metadata verification (samples)

${verifyBlock || "_No new exports to verify._"}

## Failures

${failures.length === 0 ? "_None._" : `| Performance ID | Error |\n|----------------|-------|\n${failureRows}${failures.length > 40 ? `\n\n_…and ${failures.length - 40} more._` : ""}`}

## VirtualDJ scan impact

~${stats.completed + skipped} MP4 files in flat folder \`TV Performances/Midnight Special\`.

**Refresh procedure if tags look stale:**
1. Quit VirtualDJ
2. Delete stale \`<Song>\` entries for this folder from \`database.xml\` (or remove folder from library and re-add)
3. Rescan \`DJ MEDIA/VIDEO/TV Performances/Midnight Special\`
4. Filter **Album = Midnight Special** or **Grouping = Performance** (etc.)

VDJ reads container tags on first scan. Re-exported files need rescan to refresh cached Grouping/Album.

## Collection index

| Metric | Count |
|--------|------:|
| Accepted (index) | ${index?.stats.accepted ?? "—"} |
| Exported (index) | ${index?.stats.exported ?? "—"} |
| Review remaining | ${index?.stats.review ?? "—"} |

## Recommended next step

${failed > 0 ? "Re-run failed IDs with `npx tsx tools/media-collections/ms-mass-export.ts` (resume skips completed)." : "Scan folder in VirtualDJ. Review any non-Performance groupings in browser before tagging."}
`;

  await writeFile(reportPath, md, "utf8");

  console.log(`\nDone in ${(elapsedMs / 1000 / 60).toFixed(1)} min`);
  console.log(`Exported ${exported} · Skipped ${skipped} · Failed ${failed}`);
  console.log(`Manifest → ${msExportManifestPath()}`);
  console.log(`Report → ${reportPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
