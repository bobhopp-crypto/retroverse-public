/**
 * Publish every valid render-spec scene as a mobile Retrograph card.
 */

import type { CollectorPackage } from "@/lib/ops/studio/collector/types";
import { loadSongDnaPackage } from "@/lib/ops/studio/collector/song-dna-store";
import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";
import type { DirectorEditorialPackage } from "@/lib/ops/studio/editor/types";
import type { Retrograph } from "@/lib/ops/studio/retrograph/types";
import type { ParsedExperience } from "@/lib/retroverse/renderer/types";
import { songDnaWatercolorDataUrl } from "@/lib/retroverse/renderer/song-dna-watercolor";
import type {
  MuseumChartPayload,
  PresentableScene,
  PresentationLayout,
} from "@/lib/retroverse/renderer/scene-presentation";
import type { MomentType } from "@/lib/retroverse/scene-composer/types";

type ComposeInput = {
  experience: ParsedExperience;
  collector: CollectorPackage;
  retrograph: Retrograph | null;
  songDna: CollectorSongDna | null;
  chart: MuseumChartPayload | null;
  directorHandoff?: DirectorEditorialPackage | null;
};

function momentForPurpose(purpose: string, templateId: string): MomentType {
  if (purpose.includes("chart")) return "chart_milestone";
  if (purpose.includes("timeline")) return "timeline_beat";
  if (purpose.includes("performance")) return "performance_spotlight";
  if (purpose.includes("cover")) return "hero_moment";
  if (purpose.includes("song_dna")) return "visual_break";
  if (purpose.includes("fact:")) return "did_you_know";
  if (templateId === "timeline") return "timeline_beat";
  if (templateId === "chart") return "chart_milestone";
  if (templateId === "performance") return "performance_spotlight";
  return "did_you_know";
}

function layoutForScene(scene: ParsedExperience["scenes"][number], moment: MomentType): PresentationLayout {
  if (scene.narrativePurpose.includes("chart")) return "chart";
  if (scene.narrativePurpose.includes("timeline")) return "timeline";
  if (scene.narrativePurpose.includes("performance")) return "performance";
  if (scene.narrativePurpose.includes("song_dna")) return "museum_dna";
  if (scene.narrativePurpose.includes("cover")) return "museum_identity";
  if (scene.assets.imageUrls.length > 0 && scene.supportingCopy.trim()) return "image_quote";
  if (scene.assets.imageUrls.length > 0) return "fullscreen";
  return "minimal_fact";
}

function shouldSkipScene(scene: ParsedExperience["scenes"][number]): string | null {
  const hasCopy = Boolean(scene.supportingCopy.trim() || scene.headline.trim());
  const hasFacts = scene.assets.factTexts.some((f) => f.trim());
  const hasImages = scene.assets.imageUrls.length > 0;
  const hasChart = scene.narrativePurpose.includes("chart");
  const hasDna = scene.narrativePurpose.includes("song_dna");
  const hasPerformance = Boolean(scene.assets.performanceId);

  if (scene.narrativePurpose.includes("quote") && !hasCopy && !hasFacts) {
    return "empty quote";
  }
  if (!hasCopy && !hasFacts && !hasImages && !hasChart && !hasDna && !hasPerformance) {
    return "empty experience";
  }
  if (
    scene.supportingCopy.trim() &&
    /^"When You'?re in Love with a Beautiful Woman" is a song by Dr\.?$/i.test(scene.supportingCopy.trim()) &&
    !hasFacts
  ) {
    return "truncated opener only";
  }
  return null;
}

export function composeRetrographMobileExperience(input: ComposeInput): PresentableScene[] {
  const { experience, collector, songDna, chart } = input;
  const watercolor = songDna ? songDnaWatercolorDataUrl(songDna) : null;
  const coverUrl = collector.visualAssets?.coverUrl ?? collector.song?.coverUrl ?? null;

  const scenes: PresentableScene[] = [];

  for (const scene of experience.scenes) {
    const skip = shouldSkipScene(scene);
    if (skip) continue;

    const moment = momentForPurpose(scene.narrativePurpose, scene.templateId);
    const layout = layoutForScene(scene, moment);
    const isDna = scene.narrativePurpose.includes("song_dna");
    const isCover = scene.narrativePurpose.includes("cover");
    const isChart = scene.narrativePurpose.includes("chart");

    scenes.push({
      ...scene,
      momentType: moment,
      momentLabel: scene.headline.trim() || moment.replace(/_/g, " "),
      sourceSceneNumbers: [scene.sceneNumber],
      visualIntensity: isCover || isDna ? "high" : "medium",
      composeReason: scene.narrativePurpose || "retrograph-scene",
      presentationLayout: layout,
      imageTreatment: "original",
      museumRoom: isCover
        ? "cover"
        : isChart
          ? "chart_journey"
          : isDna
            ? "song_dna"
            : scene.narrativePurpose.includes("performance")
              ? "performance"
              : "extended",
      coverUrl: isCover ? coverUrl : null,
      dnaWatercolorSvg: isDna ? watercolor : null,
      museumChart: isChart ? chart : null,
      releaseYear: collector.identity?.year ?? null,
    });
  }

  return scenes;
}

export async function loadSongDnaForRvtr(rvtr: string): Promise<CollectorSongDna | null> {
  return loadSongDnaPackage(rvtr);
}

/** @deprecated Sprint 3.29 — use `composeRetrographMobileExperience`. */
export const composeDossierMobileExperience = composeRetrographMobileExperience;
