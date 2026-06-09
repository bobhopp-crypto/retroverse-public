/**
 * Midnight Special weekly sync — detect new official releases vs local manifests.
 *
 * Usage:
 *   npx tsx tools/media-collections/ms-sync.ts
 *   npx tsx tools/media-collections/ms-sync.ts --sync-and-acquire
 *   npx tsx tools/media-collections/ms-sync.ts --retry-private
 */
import { runMidnightSpecialSync, type MsSyncMode } from "@/lib/ops/media-collections/midnight-special/sync";

function parseMode(argv: string[]): MsSyncMode {
  if (argv.includes("--sync-and-acquire")) return "sync-and-acquire";
  if (argv.includes("--retry-private")) return "retry-private";
  return "report";
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  const report = await runMidnightSpecialSync(mode);

  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) {
    process.exit(1);
  }

  const { coverage, new_episodes, removed_episodes, private_restored, private_watchlist } =
    report;

  console.log("\n--- Midnight Special Sync ---");
  console.log(`Mode: ${mode}`);
  console.log(`Status: ${coverage.status_label}`);
  console.log(
    `Published Coverage: ${coverage.downloaded} / ${coverage.published} (${coverage.published_coverage_pct}%)`,
  );
  console.log(
    `Historical Coverage: ${coverage.downloaded} / ${coverage.historical} (${coverage.historical_coverage_pct}%)`,
  );
  console.log(`Official playlist: ${report.official_playlist_count} (${report.official_playlist_count_delta >= 0 ? "+" : ""}${report.official_playlist_count_delta})`);
  console.log(`New episodes: ${new_episodes.length}`);
  console.log(`Removed episodes: ${removed_episodes.length}`);
  console.log(`Private restored: ${private_restored.length}`);
  console.log(
    `Private watchlist: ${private_watchlist.map((w) => `${w.episode_id}=${w.status}`).join(", ")}`,
  );

  if (report.acquisition) {
    const a = report.acquisition;
    console.log(
      `Acquisition: ${a.downloaded} downloaded, ${a.download_skipped} skipped, ${a.download_failed} failed, ${a.performances_generated} performances`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
