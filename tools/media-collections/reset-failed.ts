/**
 * Reset failed episodes to discovered for retry.
 * Usage: npx tsx tools/media-collections/reset-failed.ts midnight_special
 */
import { listEpisodes, saveEpisode } from "@/lib/ops/media-collections/state";

async function main() {
  const collectionId = process.argv[2]?.trim() || "midnight_special";
  const episodes = await listEpisodes(collectionId);
  let n = 0;
  for (const ep of episodes) {
    if (ep.status !== "failed") continue;
    await saveEpisode({
      ...ep,
      status: "discovered",
      updated_at: new Date().toISOString(),
    });
    n += 1;
  }
  console.log(`Reset ${n} failed episodes in ${collectionId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
