/**
 * Midnight Special performance dashboard verification.
 * Usage: npx tsx tools/media-collections/ms-performance-verify.ts
 */
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import {
  acceptAllExactMatches,
  generateAllPerformanceCandidates,
  loadEpisodePerformanceManifest,
  loadPerformanceIndex,
  updatePerformanceRecord,
} from "@/lib/ops/media-collections/midnight-special/performances";
import { MS_COLLECTION_ID } from "@/lib/ops/media-collections/midnight-special/paths";
import { listEpisodes } from "@/lib/ops/media-collections/state";

type Check = { name: string; pass: boolean; detail: string };

async function main() {
  const checks: Check[] = [];
  const before = await loadPerformanceIndex();

  const gen = await generateAllPerformanceCandidates();
  const afterGen = await loadPerformanceIndex();

  checks.push({
    name: "generate_all_episodes",
    pass: gen.episodes_processed >= 161,
    detail: `processed ${gen.episodes_processed}, performances ${gen.performances_total}`,
  });

  checks.push({
    name: "performances_total_positive",
    pass: (afterGen?.stats.performances_total ?? 0) > 2000,
    detail: `total ${afterGen?.stats.performances_total ?? 0}`,
  });

  const accept = await acceptAllExactMatches();
  const afterAccept = await loadPerformanceIndex();

  checks.push({
    name: "accept_exact_increases_accepted",
    pass:
      accept.updated_to_accepted > 0 || (afterAccept?.stats.accepted ?? 0) > 2000,
    detail: `newly accepted ${accept.updated_to_accepted}, total accepted ${afterAccept?.stats.accepted ?? 0}`,
  });

  checks.push({
    name: "review_queue_populated",
    pass: (afterAccept?.stats.review ?? 0) > 0,
    detail: `review queue ${afterAccept?.stats.review ?? 0}`,
  });

  // Idempotency: rerun generate should not duplicate
  const countBefore = afterAccept?.stats.performances_total ?? 0;
  const gen2 = await generateAllPerformanceCandidates();
  const afterGen2 = await loadPerformanceIndex();
  checks.push({
    name: "idempotent_rerun",
    pass:
      gen2.performances_total === countBefore &&
      (afterGen2?.stats.performances_total ?? 0) === countBefore,
    detail: `before ${countBefore}, after ${afterGen2?.stats.performances_total ?? 0}`,
  });

  // Manual status preserved: mark one review item rejected, rerun, check preserved
  const episodes = await listEpisodes(MS_COLLECTION_ID);
  let manualPreserved = false;
  let manualDetail = "no review perf to test";
  for (const ep of episodes) {
    const manifest = await loadEpisodePerformanceManifest(ep.id);
    const reviewPerf = manifest?.performances.find((p) => p.status === "review");
    if (!reviewPerf) continue;
    await updatePerformanceRecord(ep.id, reviewPerf.performance_id, { status: "rejected" });
    await generateAllPerformanceCandidates();
    const remanifest = await loadEpisodePerformanceManifest(ep.id);
    const again = remanifest?.performances.find(
      (p) => p.performance_id === reviewPerf.performance_id,
    );
    manualPreserved = again?.status === "rejected";
    manualDetail = `${ep.id} ${reviewPerf.performance_id} → ${again?.status}`;
    break;
  }
  checks.push({
    name: "manual_status_preserved",
    pass: manualPreserved,
    detail: manualDetail,
  });

  // Preview path: accepted performance exists
  const acceptedCount = afterAccept?.stats.accepted ?? 0;
  checks.push({
    name: "accepted_for_preview",
    pass: acceptedCount > 2000,
    detail: `accepted ${acceptedCount}`,
  });

  const episodesZero = afterAccept?.stats.episodes_zero_candidates ?? 0;
  checks.push({
    name: "zero_candidate_episodes_documented",
    pass: episodesZero >= 12,
    detail: `zero candidates: ${episodesZero} (expected ~12 missing chapters)`,
  });

  const allPass = checks.every((c) => c.pass);

  const reportDir = join(process.cwd(), "reports", "media-collections");
  await mkdir(reportDir, { recursive: true });
  const reportPath = join(reportDir, "midnight-special-performance-verify.md");

  const md = `# Midnight Special Performance Dashboard — Verification

**Generated:** ${new Date().toISOString()}  
**Result:** ${allPass ? "PASS" : "FAIL"}

## Before / After

| Metric | Before | After generate | After accept exact |
|--------|-------:|---------------:|-------------------:|
| Performances | ${before?.stats.performances_total ?? 0} | ${afterGen?.stats.performances_total ?? 0} | ${afterAccept?.stats.performances_total ?? 0} |
| Accepted | ${before?.stats.accepted ?? 0} | ${afterGen?.stats.accepted ?? 0} | ${afterAccept?.stats.accepted ?? 0} |
| Review | ${before?.stats.review ?? 0} | ${afterGen?.stats.review ?? 0} | ${afterAccept?.stats.review ?? 0} |
| Failed parses | ${before?.stats.failed_parse_count ?? 0} | ${afterGen?.stats.failed_parse_count ?? 0} | ${afterAccept?.stats.failed_parse_count ?? 0} |
| Est. export GB | ${before?.stats.estimated_export_gb ?? 0} | ${afterGen?.stats.estimated_export_gb ?? 0} | ${afterAccept?.stats.estimated_export_gb ?? 0} |

## Generation summary

- Episodes processed: ${gen.episodes_processed}
- Episodes with performances: ${gen.episodes_with_performances}
- Episodes zero candidates: ${gen.episodes_zero_candidates}
- Failed parses: ${gen.failed_parse_count}

## Accept exact summary

- Updated to accepted: ${accept.updated_to_accepted}
- Updated to review: ${accept.updated_to_review}
- Skipped locked: ${accept.skipped_locked}

## Checks

| Check | Pass | Detail |
|-------|------|--------|
${checks.map((c) => `| ${c.name} | ${c.pass ? "✓" : "✗"} | ${c.detail} |`).join("\n")}

## Storage

Manifests: \`RETROVERSE_DATA/media_collections/midnight_special/performances/\`
Index: \`performances/index.json\`
Episode manifests: \`performances/episodes/{episodeId}.json\`

## UI routes

- Dashboard: \`/ops/media-collections/midnight-special\`
- Review queue: \`/ops/media-collections/midnight-special/review?mode=queue\`
`;

  await writeFile(reportPath, md, "utf8");

  console.log(
    JSON.stringify(
      {
        pass: allPass,
        checks,
        before: before?.stats,
        after_accept: afterAccept?.stats,
        report: reportPath,
      },
      null,
      2,
    ),
  );

  if (!allPass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
