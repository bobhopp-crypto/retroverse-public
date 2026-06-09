/**
 * Audit Midnight Special review queue composition.
 * Usage: npx tsx tools/media-collections/ms-review-workflow-audit.ts
 */
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import {
  compositionCounts,
  summaryFromComposition,
  classifyQueue,
} from "@/lib/ops/media-collections/midnight-special/classify-segment";
import {
  getEnrichedReviewQueue,
  loadPerformanceIndex,
} from "@/lib/ops/media-collections/midnight-special/performances";

async function main() {
  const queue = await getEnrichedReviewQueue("review");
  const index = await loadPerformanceIndex();
  const classified = classifyQueue(queue.performances);
  const composition = compositionCounts(classified);
  const summary = summaryFromComposition(composition);

  const total = queue.stats.queue_total;
  const musicPct = total > 0 ? Math.round((summary.music / total) * 1000) / 10 : 0;
  const nonMusic = total - summary.music;
  const workloadBefore = total;
  const workloadAfter = summary.music;
  const reductionPct =
    workloadBefore > 0
      ? Math.round(((workloadBefore - workloadAfter) / workloadBefore) * 1000) / 10
      : 0;

  const exactMusic = classified.filter(
    (p) => p.bucket === "MUSIC" && p.confidence === "exact",
  ).length;

  const reportPath = join(
    process.cwd(),
    "reports/media-collections/midnight-special-review-workflow-audit.md",
  );
  await mkdir(join(process.cwd(), "reports/media-collections"), { recursive: true });

  const md = `# Midnight Special Review Workflow Audit

**Generated:** ${new Date().toISOString()}

## Current queue composition (${total} unresolved)

| Bucket | Count | % of queue |
|--------|------:|-----------:|
| Music | ${summary.music} | ${musicPct}% |
| Comedy/skits | ${summary.comedy_skits} | ${total ? Math.round((summary.comedy_skits / total) * 1000) / 10 : 0}% |
| Intros/interstitials | ${summary.intros_interstitials} | ${total ? Math.round((summary.intros_interstitials / total) * 1000) / 10 : 0}% |
| Movie clips | ${summary.movie_clips} | ${total ? Math.round((summary.movie_clips / total) * 1000) / 10 : 0}% |
| Unknown | ${summary.unknown} | ${total ? Math.round((summary.unknown / total) * 1000) / 10 : 0}% |

### Detailed composition

| Category | Count |
|----------|------:|
| MUSIC | ${composition.MUSIC} |
| COMEDY | ${composition.COMEDY} |
| INTRO_SEGMENT | ${composition.INTRO_SEGMENT} |
| INTERVIEW | ${composition.INTERVIEW} |
| MOVIE_CLIP | ${composition.MOVIE_CLIP} |
| COMMERCIAL | ${composition.COMMERCIAL} |
| UNKNOWN | ${composition.UNKNOWN} |

## Collection status

| Metric | Count |
|--------|------:|
| Accepted performances | ${index?.stats.accepted ?? 0} |
| Rejected segments | ${index?.stats.rejected ?? 0} |
| Ready to export | ${index?.stats.ready_to_export ?? 0} |
| Est. export storage | ${index?.stats.estimated_export_gb ?? 0} GB |

## Workload reduction (new workflow)

| Metric | Value |
|--------|------:|
| Queue before filtering | ${workloadBefore} |
| Music-only default view | ${workloadAfter} |
| Non-music hidden by default | ${nonMusic} |
| **Manual review reduction** | **~${reductionPct}%** |
| Exact music (bulk-accept eligible) | ${exactMusic} |

## Problem (before)

- Single scrolling table of ~${total} rows mixing music, comedy, intros, clips, and unknown segments.
- Reviewer must scroll past obvious non-music chapters to reach performances.

## Fix (after)

- Classify every queue item into buckets using chapter title + artist/song heuristics.
- Default filter: **MUSIC only** (${workloadAfter} items).
- Bulk reject comedy (${summary.comedy_skits}), movie clips (${summary.movie_clips}), intros (${summary.intros_interstitials}).
- Bulk accept exact music (${exactMusic}).
- Card layout with confidence badges and inline preview/accept/reject/adjust.

## Recommended next step before mass export

1. Run **Reject All Comedy**, **Reject All Movie Clips**, **Reject All Intros** (confirm each).
2. Run **Accept All Exact Music** on remaining music queue.
3. Manually review remaining **~${Math.max(0, summary.music - exactMusic)}** non-exact music candidates.
4. Spot-check UNKNOWN bucket (${summary.unknown} items) for misclassified music.
5. Re-run verification; target **<50** manual music reviews before enabling export batch.

**Do not export** until music queue is near zero and export spot-check passes on 5 accepted clips.
`;

  await writeFile(reportPath, md, "utf8");
  console.log(JSON.stringify({ report: reportPath, summary, composition, reductionPct }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
