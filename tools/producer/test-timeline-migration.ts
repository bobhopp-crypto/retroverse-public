/**
 * Verify v1 → v2 producer timeline migration (no fs).
 * Run: npx tsx tools/producer/test-timeline-migration.ts
 */
import { buildEraBalanceRows, computeEraRuntimeSeconds } from "../../lib/ops/year-workspace/producer/era-balance";
import { buildPlanningZones, planningRulerTicks } from "../../lib/ops/year-workspace/producer/planning-grid";
import { legacyBlockId, migrateV1ToV2 } from "../../lib/ops/year-workspace/producer/migrate";
import { normalizeEraTargets } from "../../lib/ops/year-workspace/producer/era";
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
if (music.id !== legacyBlockId("music_block")) {
  throw new Error(`expected stable block id ${legacyBlockId("music_block")}, got ${music.id}`);
}
const again = migrateV1ToV2(v1, 1967);
const music2 = again.blocks.find((b) => b.legacyKey === "music_block");
if (music2?.id !== music.id) {
  throw new Error("migration must produce stable block ids across runs");
}
const asset = music.assets[0];
if (effectiveRuntimeSeconds(asset) !== 180) {
  throw new Error(`override runtime expected 180, got ${effectiveRuntimeSeconds(asset)}`);
}

const total = computeShowRuntimeSeconds(migrated);
if (total !== 180) throw new Error(`show total expected 180, got ${total}`);

const blockTotal = sumBlockRuntimeSeconds(music);
if (blockTotal !== 180) throw new Error(`block total expected 180, got ${blockTotal}`);

if (music.eraId !== "mixed") throw new Error("migrated block eraId should default mixed");
if (migrated.eraTargets[1967] !== 30) throw new Error("era targets default missing");

const eraTotals = computeEraRuntimeSeconds(migrated);
if (eraTotals.mixed !== 180) {
  throw new Error(`mixed era total expected 180, got ${eraTotals.mixed}`);
}

const balance = buildEraBalanceRows(migrated);
if (balance.length !== 4) throw new Error(`expected 4 era balance rows, got ${balance.length}`);

const ticks = planningRulerTicks(120);
if (!ticks.includes(0) || !ticks.includes(120) || ticks[1] !== 15) {
  throw new Error(`unexpected planning ticks: ${ticks.join(",")}`);
}

const zones = buildPlanningZones(120);
if (zones.length !== 8) throw new Error(`expected 8 zones for 120min, got ${zones.length}`);

const v2Legacy = {
  ...migrated,
  blocks: migrated.blocks.map((b) => ({ ...b, eraId: undefined as unknown })),
  eraTargets: undefined,
};
const eraFromMissing = normalizeEraTargets(v2Legacy.eraTargets);
if (eraFromMissing[1992] !== 30) throw new Error("normalizeEraTargets failed");

console.log(
  JSON.stringify({
    ok: true,
    blockCount: migrated.blocks.length,
    musicTitle: music.title,
    showTotalSeconds: total,
  }),
);
