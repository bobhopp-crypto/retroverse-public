/**
 * Download missing episodes for a collection.
 * Usage:
 *   npx tsx tools/media-collections/download-missing.ts midnight_special
 *   npx tsx tools/media-collections/download-missing.ts midnight_special 3
 */
import { runDownloadMissing } from "@/lib/ops/media-collections/download-runner";

async function main() {
  const collectionId = process.argv[2]?.trim() || "midnight_special";
  const limitArg = process.argv[3]?.trim();
  const limit = limitArg ? Number(limitArg) : undefined;

  const result = await runDownloadMissing(collectionId, { limit });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok && result.stopped_reason === "already_running") process.exit(2);
  if (!result.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
