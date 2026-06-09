/**
 * Audit UNKNOWN → MUSIC reclassification from second-pass chapter parsing.
 * Usage: npx tsx tools/media-collections/ms-unknown-reclassify-audit.ts
 */
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import {
  classifyPerformance,
  compositionCounts,
  summaryFromComposition,
  type SegmentBucket,
} from "@/lib/ops/media-collections/midnight-special/classify-segment";
import { parseArtistSong } from "@/lib/ops/media-collections/midnight-special/parse-artist-song";
import { getEnrichedReviewQueue } from "@/lib/ops/media-collections/midnight-special/performances";
import type { MsPerformanceRecord } from "@/lib/ops/media-collections/midnight-special/types";

const COMEDY_RE =
  /\b(comedy|sketch|monty python|steve martin|david steinberg|freddie prinze|jimmie walker|committee|ace trucking|kentucky fried|carlin|braver|troupe|laugh-?in|national lampoon|funny business|stand-?up)\b|\[comedy segment\]/i;
const MOVIE_CLIP_RE =
  /\b(clip\b|movie clip|from the film|from the movie|scene from|excerpt from|clip from)\b|^clip\b/i;
const INTERVIEW_RE = /\b(interview|speaks with|talks with|conversation with|q&a|qa with)\b/i;
const INTRO_RE =
  /\b(intro|prologue|juggles|tribute|monologue|welcome|opening remarks|host segment|intermission|announcer|presents)\b|^(intro|outro|host)\b/i;

const INTRO_RE_V2 =
  /\b(intro|prologue|juggles|tribute|monologue|welcome|opening remarks|host segment|intermission|announcer|presents|introduces)\b|^(intro|outro|host)\b/i;
const COMMERCIAL_RE = /\b(commercial break|commercial|sponsor|promo|advertisement)\b/i;

/** Pre-second-pass bucket logic (for before/after report). */
function classifyLegacy(record: MsPerformanceRecord): SegmentBucket {
  const chapter = record.source_chapter.trim();
  const chapterLower = chapter.toLowerCase();
  const combined = `${chapterLower} ${record.artist.toLowerCase()} ${record.song.toLowerCase()}`;

  if (COMMERCIAL_RE.test(combined)) return "COMMERCIAL";
  if (MOVIE_CLIP_RE.test(combined) || /^clip\b/i.test(chapter)) return "MOVIE_CLIP";
  if (COMEDY_RE.test(combined) || COMEDY_RE.test(chapter)) return "COMEDY";
  if (INTERVIEW_RE.test(combined)) return "INTERVIEW";
  if (INTRO_RE.test(combined)) return "INTRO_SEGMENT";

  if (parseArtistSong(chapter)) return "MUSIC";
  if (/^[^"]+\s+"/.test(chapter)) return "MUSIC";
  if (record.artist && record.song && !record.failed_parse) return "MUSIC";
  if (
    record.song &&
    record.confidence !== "low" &&
    !record.failed_parse &&
    record.artist.length >= 2
  ) {
    return "MUSIC";
  }

  return "UNKNOWN";
}

async function main() {
  const queue = await getEnrichedReviewQueue("review");
  const rows = queue.performances;

  let musicBefore = 0;
  let unknownBefore = 0;
  let musicAfter = 0;
  let unknownAfter = 0;
  let unknownBucketBefore = 0;
  let unknownBucketAfter = 0;
  const reclassified: Array<{
    performance_id: string;
    chapter: string;
    artist: string;
    song: string;
  }> = [];

  for (const row of rows) {
    const before = classifyLegacy(row);
    const after = classifyPerformance(row);
    if (before === "MUSIC") musicBefore += 1;
    if (before === "UNKNOWN") unknownBucketBefore += 1;
    if (before === "UNKNOWN" || before === "COMMERCIAL") unknownBefore += 1;
    if (after === "MUSIC") musicAfter += 1;
    if (after === "UNKNOWN") unknownBucketAfter += 1;
    if (after === "UNKNOWN" || after === "COMMERCIAL") unknownAfter += 1;
    if (before !== "MUSIC" && after === "MUSIC") {
      reclassified.push({
        performance_id: row.performance_id,
        chapter: row.source_chapter,
        artist: row.artist,
        song: row.song,
      });
    }
  }

  const composition = compositionCounts(
    rows.map((r) => ({ ...r, bucket: classifyPerformance(r) })),
  );
  const summary = summaryFromComposition(composition);

  const reportPath = join(
    process.cwd(),
    "reports/media-collections/midnight-special-unknown-reclassify-audit.md",
  );
  await mkdir(join(process.cwd(), "reports/media-collections"), { recursive: true });

  const sample = reclassified
    .slice(0, 40)
    .map(
      (r) =>
        `| \`${r.performance_id}\` | ${r.chapter.replace(/\|/g, "\\|")} | ${r.artist} | ${r.song || "—"} |`,
    )
    .join("\n");

  const md = `# Midnight Special UNKNOWN Reclassification Audit

**Generated:** ${new Date().toISOString()}

## Summary (review queue only — ${rows.length} items)

| Metric | Before | After | Delta |
|--------|-------:|------:|------:|
| MUSIC | ${musicBefore} | ${musicAfter} | ${musicAfter - musicBefore > 0 ? "+" : ""}${musicAfter - musicBefore} |
| UNKNOWN (bucket) | ${unknownBucketBefore} | ${unknownBucketAfter} | ${unknownBucketAfter - unknownBucketBefore} |
| UNKNOWN (+ commercial in summary) | ${unknownBefore} | ${unknownAfter} | ${unknownAfter - unknownBefore} |

No review statuses were auto-accepted. Reclassified items stay in \`review\` until manually accepted.

## Current composition (after second-pass)

| Bucket | Count |
|--------|------:|
| MUSIC | ${composition.MUSIC} |
| COMEDY | ${composition.COMEDY} |
| INTRO_SEGMENT | ${composition.INTRO_SEGMENT} |
| INTERVIEW | ${composition.INTERVIEW} |
| MOVIE_CLIP | ${composition.MOVIE_CLIP} |
| COMMERCIAL | ${composition.COMMERCIAL} |
| UNKNOWN | ${composition.UNKNOWN} |

Summary unknown (incl. commercial): **${summary.unknown}**

## Reclassified to MUSIC (${reclassified.length} items)

No review status changes were made. Items remain in \`review\` until manually accepted.

| Performance ID | Chapter | Artist | Song |
|----------------|---------|--------|------|
${sample || "| — | — | — | — |"}

${reclassified.length > 40 ? `\n_…and ${reclassified.length - 40} more._\n` : ""}
`;

  await writeFile(reportPath, md, "utf8");
  console.log(`Wrote ${reportPath}`);
  console.log(`MUSIC: ${musicBefore} → ${musicAfter}`);
  console.log(`UNKNOWN: ${unknownBefore} → ${unknownAfter}`);
  console.log(`Reclassified: ${reclassified.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
