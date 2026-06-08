/**
 * Scan a collection playlist (local verification).
 * Usage: npx tsx tools/media-collections/scan.ts midnight_special
 */
import { scanCollectionPlaylist } from "@/lib/ops/media-collections/scan-playlist";

async function main() {
  const collectionId = process.argv[2]?.trim() || "midnight_special";
  const result = await scanCollectionPlaylist(collectionId);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
