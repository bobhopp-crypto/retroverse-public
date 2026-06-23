#!/usr/bin/env npx tsx
/**
 * Process one song through the Intelligence Workbench pipeline (Phase 2).
 *
 * Usage:
 *   npx tsx tools/intelligence/process-song.ts RVTR285085
 *   npx tsx tools/intelligence/process-song.ts --title "You Can Call Me Al" --artist "Paul Simon"
 *   npx tsx tools/intelligence/process-song.ts RVTR285085 --build-cards
 */
import { inspectQuery } from "../../lib/inspect/pg.ts";
import { buildCardsFromReview, processSong } from "../../lib/ops/intelligence/process-song.ts";
import { runProductionPipeline } from "../../lib/ops/intelligence/production-pipeline.ts";

async function resolveRvtr(args: string[]): Promise<string> {
  const direct = args.find((a) => /^RVTR\d{6}$/i.test(a));
  if (direct) return direct.toUpperCase();

  let title = "";
  let artist = "";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--title" && args[i + 1]) title = args[++i]!;
    if (args[i] === "--artist" && args[i + 1]) artist = args[++i]!;
  }

  if (!title) {
    console.error("Usage: npx tsx tools/intelligence/process-song.ts RVTR285085");
    console.error('   or: npx tsx tools/intelligence/process-song.ts --title "You Can Call Me Al" --artist "Paul Simon"');
    process.exit(1);
  }

  const rows = await inspectQuery<{ track_id: string }>(
    `
    SELECT track_id FROM canonical_track_display
    WHERE lower(canonical_title) = lower($1)
      AND lower(canonical_artist_name) LIKE '%' || lower($2) || '%'
    ORDER BY has_hot100 DESC, peak_hot100_position ASC NULLS LAST
    LIMIT 1
    `,
    [title, artist || "%"],
  );
  const rvtr = rows[0]?.track_id;
  if (!rvtr) {
    console.error(`Track not found: "${title}" by ${artist || "?"}`);
    process.exit(1);
  }
  return rvtr.toUpperCase();
}

async function main() {
  const buildCards = process.argv.includes("--build-cards");
  const publish = process.argv.includes("--publish");
  const argv = process.argv.slice(2).filter((a) => a !== "--build-cards" && a !== "--publish");
  const rvtr = await resolveRvtr(argv);
  console.log(`\nRetroverse Intelligence Workbench (Phase 2)`);
  console.log(`Processing ${rvtr}…\n`);

  if (publish) {
    const pub = await runProductionPipeline(rvtr, { force: process.argv.includes("--force") });
    const pkg = pub.package;
    for (const line of pkg.processLog.slice(-8)) console.log(`  ${line}`);
    if (!pub.ok || !pub.published) {
      console.error(`\nPublish failed: ${pub.error}`);
      process.exit(1);
    }
    console.log(`\n✓ Published song sheet`);
    console.log(`  Facts:     ${pub.approvedFacts}`);
    console.log(`  Cards:     ${pub.cardsBuilt}`);
    console.log(`\n  Song sheet: /rvtr/${rvtr}/song-sheet`);
    return;
  }

  const result = await processSong(rvtr);
  let pkg = result.package;

  for (const line of pkg.processLog) {
    console.log(`  ${line}`);
  }

  if (!result.ok) {
    console.error(`\nFailed: ${result.error}`);
    process.exit(1);
  }

  console.log(`\n✓ Song Package ready for review`);
  console.log(`  Research:  ${pkg.researchVault.length} sources`);
  console.log(`  Facts:     ${pkg.candidateFacts.length} (${pkg.candidateFacts.filter((f) => f.reviewStatus === "approved").length} auto-approved)`);
  console.log(`  Stories:   ${pkg.candidateStories.length} (${pkg.candidateStories.filter((s) => s.reviewStatus === "approved").length} auto-approved)`);

  if (buildCards) {
    const built = await buildCardsFromReview(rvtr);
    if (!built.ok || !built.package) {
      console.error(`\nBuild cards failed: ${built.error}`);
      process.exit(1);
    }
    pkg = built.package;
    console.log(`  Cards:     ${pkg.storyCards.length}`);
    for (const card of pkg.storyCards.slice(0, 6)) {
      console.log(`    · ${card.headline}`);
    }
  } else {
    console.log(`  Cards:     (run with --build-cards after review)`);
  }

  console.log(`\n  View package:   /ops/intelligence/package/${rvtr}`);
  console.log(`  Artifact studio: /ops/intelligence/package/${rvtr}/artifacts`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
