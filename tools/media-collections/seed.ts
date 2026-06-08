/**
 * Seed RETROVERSE_DATA/media_collections (idempotent).
 * Usage: npx tsx tools/media-collections/seed.ts
 */
import { seedMediaCollections } from "@/lib/ops/media-collections/seed";

async function main() {
  const index = await seedMediaCollections();
  console.log(`Seeded ${index.collections.length} collections → media_collections/collections.json`);
  for (const c of index.collections) {
    console.log(`  · ${c.id} (${c.status})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
