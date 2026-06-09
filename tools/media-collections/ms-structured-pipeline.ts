/**
 * Midnight Special structured processing POC — analyze, generate candidates, export sample.
 * Usage: npx tsx tools/media-collections/ms-structured-pipeline.ts [episode_id]
 */
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { analyzeMidnightSpecialEpisode } from "@/lib/ops/media-collections/midnight-special/analyze-episode";
import {
  ensureCandidateManifest,
  saveCandidateManifest,
  updatePerformanceReview,
} from "@/lib/ops/media-collections/midnight-special/candidates";
import { exportAcceptedPerformance } from "@/lib/ops/media-collections/midnight-special/export-performance";
import { generateCandidateManifest } from "@/lib/ops/media-collections/midnight-special/parse-performances";

const DEFAULT_EPISODE = "027bA7mICxM";

async function main() {
  const episodeId = process.argv[2]?.trim() || DEFAULT_EPISODE;

  const analysis = await analyzeMidnightSpecialEpisode(episodeId);
  if (!analysis) {
    console.error("Episode not found:", episodeId);
    process.exit(1);
  }

  const manifest = await generateCandidateManifest(episodeId);
  if (!manifest) {
    console.error("Failed to generate candidates");
    process.exit(1);
  }
  await saveCandidateManifest(manifest);

  const reportDir = join(process.cwd(), "reports", "media-collections");
  await mkdir(reportDir, { recursive: true });

  const md = `# Midnight Special — Episode Analysis Report

**Episode:** ${analysis.episode_title}  
**ID:** \`${episodeId}\`  
**Analyzed:** ${analysis.analyzed_at}

## Phase 1 — Structured fields on disk

| Field | Present |
|-------|---------|
${analysis.structured_fields.map((f) => `| ${f} | yes |`).join("\n")}

## Asset summary

| Asset | Value |
|-------|-------|
| Video path | \`${analysis.video_path}\` |
| Video size | ${analysis.video_bytes ? `${(analysis.video_bytes / 1024 / 1024).toFixed(1)} MB` : "—"} |
| Duration | ${analysis.video_duration_sec ?? "—"} sec |
| yt-dlp chapters | ${analysis.ytdlp_chapter_count} |
| Description chapter lines | ${analysis.description_chapter_lines} |
| Chapters aligned | ${analysis.chapters_aligned ? "yes" : "no"} |

## Phase 2 — Candidate performances

| Metric | Count |
|--------|------:|
| Total chapters | ${manifest.stats.chapter_count} |
| Skipped (intro/etc.) | ${manifest.stats.skipped_count} |
| **Performances** | **${manifest.stats.performance_count}** |
| exact | ${manifest.stats.by_confidence.exact} |
| high | ${manifest.stats.by_confidence.high} |
| medium | ${manifest.stats.by_confidence.medium} |
| low | ${manifest.stats.by_confidence.low} |
| **Automation rate** | **${manifest.stats.automation_rate_pct}%** |

## Sample candidates

| Artist | Song | Start | End | Confidence |
|--------|------|-------|-----|------------|
${manifest.performances
  .slice(0, 8)
  .map(
    (p) =>
      `| ${p.artist} | ${p.song || "—"} | ${p.start_timecode} | ${p.end_timecode} | ${p.confidence} |`,
  )
  .join("\n")}

Candidates saved: \`RETROVERSE_DATA/media_collections/midnight_special/candidates/${episodeId}.json\`

## Phase 5 — Export test

Accepting first high-confidence performance for export test…
`;

  const exportTarget =
    manifest.performances.find((p) => p.confidence === "exact") ??
    manifest.performances.find((p) => p.confidence === "high") ??
    manifest.performances[0];

  let exportSection = "No export performed.";
  if (exportTarget) {
    await updatePerformanceReview(episodeId, exportTarget.id, {
      review_status: "accepted",
    });
    const exportResult = await exportAcceptedPerformance(episodeId, exportTarget.id);
    if (exportResult.ok) {
      exportSection = `Exported **${exportResult.filename}**  
Path: \`${exportResult.path}\`  
Size: ${(exportResult.bytes / 1024 / 1024).toFixed(2)} MB  
Trim: ${exportTarget.start_timecode} → ${exportTarget.end_timecode} (${exportResult.duration_sec}s)`;
    } else {
      exportSection = `Export failed: ${exportResult.error}`;
    }
  }

  const fullMd = `${md}\n${exportSection}\n\n## Review UI\n\n\`/ops/media-collections/midnight-special/review?episode=${episodeId}\`\n`;
  const outPath = join(reportDir, `midnight-special-episode-analysis-${episodeId}.md`);
  await writeFile(outPath, fullMd, "utf8");

  console.log(
    JSON.stringify(
      {
        episode_id: episodeId,
        performances: manifest.stats.performance_count,
        automation_rate_pct: manifest.stats.automation_rate_pct,
        by_confidence: manifest.stats.by_confidence,
        export_target: exportTarget
          ? `${exportTarget.artist} - ${exportTarget.song}`
          : null,
        report: outPath,
        candidates: `RETROVERSE_DATA/media_collections/midnight_special/candidates/${episodeId}.json`,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
