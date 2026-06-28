export type {
  AssetManifest,
  DirectorRenderSpec,
  ManifestAsset,
  RenderSpecMetadata,
  RenderSpecScene,
  RenderSpecSceneAssets,
  RenderSpecTimelineEvent,
} from "@/lib/ops/studio/director/render-spec-types";

export type ParsedExperience = {
  spec: import("@/lib/ops/studio/director/render-spec-types").DirectorRenderSpec;
  scenes: import("@/lib/ops/studio/director/render-spec-types").RenderSpecScene[];
  totalDurationSec: number;
};
