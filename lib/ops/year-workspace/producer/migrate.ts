import { PRODUCER_LEGACY_V1_BLOCKS } from "./block-templates";
import { emptyProducerTimeline } from "./empty-timeline";
import type {
  ProducerShowBlock,
  ProducerTimelineAsset,
  ProducerTimelineLegacyBlockId,
  ProducerTimelineState,
} from "./types";
function isLegacyBlocksRecord(
  blocks: unknown,
): blocks is Record<string, unknown[]> {
  return blocks != null && typeof blocks === "object" && !Array.isArray(blocks);
}

/** Stable v2 block id for a legacy v1 section key (same id on every migration). */
export function legacyBlockId(legacyKey: string): string {
  return `legacy-${legacyKey}`;
}

export function migrateV1ToV2(
  raw: Record<string, unknown>,
  year: number,
): ProducerTimelineState {
  const base = emptyProducerTimeline(year);
  const targetRaw = raw.targetRuntimeMinutes;
  const targetRuntimeMinutes =
    typeof targetRaw === "number" &&
    Number.isFinite(targetRaw) &&
    targetRaw > 0 &&
    targetRaw <= 24 * 60
      ? Math.round(targetRaw)
      : base.targetRuntimeMinutes;

  const blocksRaw = raw.blocks;
  const migrated: ProducerShowBlock[] = [];
  const seen = new Set<string>();

  if (isLegacyBlocksRecord(blocksRaw)) {
    for (const legacy of PRODUCER_LEGACY_V1_BLOCKS) {
      const list = blocksRaw[legacy.id];
      const assets = Array.isArray(list)
        ? (list as unknown[])
            .map((item) => item as ProducerTimelineAsset)
            .filter((a) => a && typeof a.id === "string")
        : [];
      migrated.push({
        id: legacyBlockId(legacy.id),
        title: legacy.title,
        notes: legacy.notes,
        eraId: "mixed",
        collapsed: false,
        legacyKey: legacy.id,
        assets,
      });
      seen.add(legacy.id);
    }
    for (const key of Object.keys(blocksRaw)) {
      if (seen.has(key)) continue;
      const list = blocksRaw[key];
      if (!Array.isArray(list)) continue;
      migrated.push({
        id: legacyBlockId(key),
        title: key.replace(/_/g, " "),
        notes: null,
        eraId: "mixed",
        collapsed: false,
        legacyKey: key as ProducerTimelineLegacyBlockId,
        assets: list as ProducerTimelineAsset[],
      });
    }
  }

  return {
    version: 2,
    year,
    targetRuntimeMinutes,
    eraTargets: base.eraTargets,
    blocks: migrated.length > 0 ? migrated : base.blocks,
    updatedAt:
      typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
  };
}

export function isV1TimelineRaw(raw: Record<string, unknown>): boolean {
  if (raw.version === 1) return true;
  return isLegacyBlocksRecord(raw.blocks);
}
