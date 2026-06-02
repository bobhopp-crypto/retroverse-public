/**
 * Verify v1 → v2 producer timeline migration (no fs).
 * Run: npx tsx tools/producer/test-timeline-migration.ts
 */
import { migrateV1ToV2 } from "../../lib/ops/year-workspace/producer/migrate";
import {
  computeShowRuntimeSeconds,
  effectiveRuntimeSeconds,
  sumBlockRuntimeSeconds,
} from "../../lib/ops/year-workspace/producer/runtime";

const v1 = {
  version: 1,
  year: 1967,
  targetRuntimeMinutes: 120,
  blocks: {
    opening: [],
    music_block: [
      {
        id: "asset-1",
        producerCategory: "songs",
        productionCategory: "songs",
        productionItemId: "ws-1",
        title: "Test Song",
        subtitle: null,
        runtimeSeconds: 210,
        runtimeOverrideSeconds: 180,
      },
    ],
    commercial_break: [],
    tv_memory: [],
    news_moment: [],
    feature_segment: [],
    closing: [],
  },
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const migrated = migrateV1ToV2(v1, 1967);
if (migrated.version !== 2) throw new Error("expected version 2");
if (migrated.blocks.length !== 7) throw new Error(`expected 7 blocks, got ${migrated.blocks.length}`);

const music = migrated.blocks.find((b) => b.legacyKey === "music_block");
if (!music || music.assets.length !== 1) throw new Error("music_block assets missing");
const asset = music.assets[0];
if (effectiveRuntimeSeconds(asset) !== 180) {
  throw new Error(`override runtime expected 180, got ${effectiveRuntimeSeconds(asset)}`);
}

const total = computeShowRuntimeSeconds(migrated);
if (total !== 180) throw new Error(`show total expected 180, got ${total}`);

const blockTotal = sumBlockRuntimeSeconds(music);
if (blockTotal !== 180) throw new Error(`block total expected 180, got ${blockTotal}`);

console.log(
  JSON.stringify({
    ok: true,
    blockCount: migrated.blocks.length,
    musicTitle: music.title,
    showTotalSeconds: total,
  }),
);
