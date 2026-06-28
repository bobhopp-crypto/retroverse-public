import type { DirectorRenderSpec, RenderSpecScene } from "./types";

import { DIRECTOR_RENDER_SPEC_VERSION } from "@/lib/studio/package";

import type { ParsedExperience } from "./types";

const OPS_ASSET_PREFIX = "/api/ops/studio/collector/visual-asset";
const EXPERIENCE_ASSET_PREFIX = "/api/experience/visual-asset";

export function rewriteExperienceImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith(EXPERIENCE_ASSET_PREFIX)) return url;
  if (url.startsWith(OPS_ASSET_PREFIX)) {
    return url.replace(OPS_ASSET_PREFIX, EXPERIENCE_ASSET_PREFIX);
  }
  return url;
}

function rewriteSceneAssets(scene: RenderSpecScene): RenderSpecScene {
  return {
    ...scene,
    assets: {
      ...scene.assets,
      imageUrls: scene.assets.imageUrls.map((u) => rewriteExperienceImageUrl(u) ?? u),
    },
  };
}

export function parseRenderSpec(raw: unknown): ParsedExperience | null {
  if (!raw || typeof raw !== "object") return null;
  const spec = raw as DirectorRenderSpec;

  if (spec.version !== DIRECTOR_RENDER_SPEC_VERSION) return null;
  if (!spec.metadata?.rvtr || !Array.isArray(spec.sceneTimeline) || spec.sceneTimeline.length === 0) {
    return null;
  }

  const order = spec.renderingInstructions?.sceneOrder ?? spec.sceneTimeline.map((s) => s.sceneNumber);
  const byNumber = new Map(spec.sceneTimeline.map((s) => [s.sceneNumber, s]));
  const scenes = order
    .map((n) => byNumber.get(n))
    .filter((s): s is RenderSpecScene => Boolean(s))
    .map(rewriteSceneAssets);

  if (scenes.length === 0) return null;

  const totalDurationSec =
    spec.metadata.estimatedRuntimeSec ??
    scenes.reduce((sum, s) => sum + (s.durationSec || 0), 0);

  return {
    spec: {
      ...spec,
      sceneTimeline: scenes,
    },
    scenes,
    totalDurationSec,
  };
}
