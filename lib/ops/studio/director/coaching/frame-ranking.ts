import "server-only";

import type { CollectorPackage } from "@/lib/ops/studio/collector/types";
import type { DirectorPackage } from "@/lib/ops/studio/director/types";
import {
  EXHIBIT_IDS,
  exhibitIdFromScene,
  type ExhibitId,
} from "@/lib/ops/studio/director/exhibit-plan";

import type { FrameRankMetadata } from "./types";

const CATEGORY_SHARPNESS_PROXY: Record<string, number> = {
  Hero: 78,
  "Close-up": 88,
  Performance: 82,
  Alternate: 75,
  Crowd: 68,
};

function assetById(collector: CollectorPackage): Map<string, (typeof collector.visualAssets.extraction.assets)[number]> {
  const perf = collector.performances?.[0];
  const assets = perf?.visualAssets.extraction.assets ?? collector.visualAssets.extraction.assets ?? [];
  return new Map(assets.map((a) => [a.id, a]));
}

function computeNeighborDistanceSec(
  asset: { timestampSec: number } | undefined,
  all: Array<{ timestampSec: number }>,
): number | null {
  if (!asset) return null;
  const others = all.filter((a) => a.timestampSec !== asset.timestampSec);
  if (others.length === 0) return null;
  return Math.min(...others.map((o) => Math.abs(o.timestampSec - asset.timestampSec)));
}

function buildFrameRank(
  assetId: string | null,
  collector: CollectorPackage,
  usedCategories: Set<string>,
): FrameRankMetadata | null {
  if (!assetId) return null;
  const map = assetById(collector);
  const asset = map.get(assetId);
  const allAssets = [...map.values()];

  if (!asset) {
    return {
      assetId,
      category: "unknown",
      quality: 50,
      sharpness: null,
      motion: "unknown",
      brightness: null,
      uniqueness: 50,
      neighborDistanceSec: null,
      diversityScore: 50,
      selectionReason: "Assigned from editor handoff image",
    };
  }

  const sharpness = CATEGORY_SHARPNESS_PROXY[asset.category] ?? 72;
  const quality = Math.round(Math.min(100, (asset.width * asset.height) / 15000 + sharpness * 0.35));
  const neighborDistanceSec = computeNeighborDistanceSec(asset, allAssets);
  const uniqueness = usedCategories.has(asset.category) ? 35 : 85;
  const diversityScore = Math.round(
    uniqueness * 0.45 +
      Math.min(100, (neighborDistanceSec ?? 0) * 8) * 0.35 +
      sharpness * 0.2,
  );

  const motion =
    neighborDistanceSec != null && neighborDistanceSec >= 4
      ? "distinct moment"
      : neighborDistanceSec != null && neighborDistanceSec >= 2
        ? "moderate separation"
        : "near duplicate timing";

  return {
    assetId: asset.id,
    category: asset.category,
    quality,
    sharpness,
    motion,
    brightness: Math.round(Math.min(100, asset.width / 19.2)),
    uniqueness,
    neighborDistanceSec,
    diversityScore,
    selectionReason: asset.selectionReason,
  };
}

const EXHIBIT_LABELS: Record<ExhibitId, string> = {
  cover: "Cover",
  chart_journey: "Chart Journey",
  iconic_moment: "Iconic Moment",
  song_dna: "Song DNA",
  performance: "Performance",
};

export function buildExhibitFrameRanks(
  director: DirectorPackage,
  collector: CollectorPackage,
): Array<{ exhibitId: ExhibitId; label: string; sceneNumber: number; frame: FrameRankMetadata | null; assetIds: string[] }> {
  const usedCategories = new Set<string>();
  const out: Array<{
    exhibitId: ExhibitId;
    label: string;
    sceneNumber: number;
    frame: FrameRankMetadata | null;
    assetIds: string[];
  }> = [];

  for (const exhibitId of EXHIBIT_IDS) {
    const scene = director.experiencePlan.scenes.find((s) => exhibitIdFromScene(s) === exhibitId);
    if (!scene) continue;

    const assetIds = scene.linkedImageAssetIds;
    const frame = assetIds[0] ? buildFrameRank(assetIds[0], collector, usedCategories) : null;
    if (frame?.category) usedCategories.add(frame.category);

    out.push({
      exhibitId,
      label: EXHIBIT_LABELS[exhibitId],
      sceneNumber: scene.sceneNumber,
      frame,
      assetIds,
    });
  }

  return out;
}

export function summarizePlanScenes(plan: unknown): Array<{
  exhibitId: string | null;
  label: string;
  headline: string;
  frameCategory: string | null;
}> {
  if (!plan || typeof plan !== "object") return [];
  const scenes = (plan as { scenes?: Array<{ sceneNumber: number; title: string; headline: string; narrativePurpose: string; linkedImageAssetIds?: string[] }> }).scenes;
  if (!Array.isArray(scenes)) return [];

  return scenes.map((scene) => {
    const exhibitId = exhibitIdFromScene(scene as Parameters<typeof exhibitIdFromScene>[0]);
    return {
      exhibitId,
      label: scene.title,
      headline: scene.headline,
      frameCategory: null,
    };
  });
}
