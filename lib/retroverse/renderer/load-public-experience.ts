import "server-only";

import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import { loadSongDnaPackage } from "@/lib/ops/studio/collector/song-dna-store";
import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";
import { loadRetrograph } from "@/lib/ops/studio/retrograph/store";
import { loadDirectorHandoff, loadDirectorPackage } from "@/lib/ops/studio/director/store";
import { directorRenderSpecPath } from "@/lib/studio/package";
import { readFile } from "fs/promises";
import { buildArtDirectionProfile } from "@/lib/retroverse/art-direction/build-art-direction-profile";
import type { ArtDirectionProfile } from "@/lib/retroverse/art-direction/types";
import {
  applyVisualProductionToScenes,
  loadVisualProduction,
} from "@/lib/ops/studio/publisher/visual-producer";
import { isExperiencePublished } from "@/lib/ops/studio/publisher/gate";
import { buildChartJourneyPresentationFromTrackPage } from "@/lib/chart-journey/chart-journey-presentation";
import { loadTrackPage } from "@/lib/track/load-track-page";
import { normalizeRvtr } from "@/lib/studio/status";

import {
  mapArtDirectionToExperienceTheme,
  NEUTRAL_EXPERIENCE_THEME,
} from "./art-direction-theme";
import { composeRetrographMobileExperience } from "./retrograph-mobile-experience";
import {
  composeMuseumExperience,
  type MuseumChartPayload,
} from "./museum-experience";
import { parseRenderSpec } from "./parse-render-spec";
import {
  loadMuseumPilotRegistry,
  showcaseRvtrFromRegistry,
} from "./museum-pilot-registry";
import type { PresentableScene } from "./scene-presentation";
import type { ParsedExperience } from "./types";

export type PublicExperiencePipeline = {
  usedComposition: boolean;
  usedArtDirection: boolean;
  usedMuseum: boolean;
  usedVisualProducer: boolean;
  originalSceneCount: number;
  composedSceneCount: number;
};

export type PublicExperiencePayload = {
  experience: ParsedExperience;
  songDna: CollectorSongDna | null;
  scenes: PresentableScene[];
  artDirection: ArtDirectionProfile | null;
  composition: null;
  themeVars: Record<string, string>;
  pipeline: PublicExperiencePipeline;
};

function safeArtDirection(
  experience: ParsedExperience,
  songDna: CollectorSongDna | null,
  rvtr: string,
): { profile: ArtDirectionProfile | null; themeVars: Record<string, string>; usedArtDirection: boolean } {
  if (!songDna) {
    return { profile: null, themeVars: NEUTRAL_EXPERIENCE_THEME, usedArtDirection: false };
  }
  try {
    const profile = buildArtDirectionProfile({
      songDna,
      experience,
      layoutId: "performance",
      rvtr,
    });
    return {
      profile,
      themeVars: mapArtDirectionToExperienceTheme(profile),
      usedArtDirection: true,
    };
  } catch {
    return { profile: null, themeVars: NEUTRAL_EXPERIENCE_THEME, usedArtDirection: false };
  }
}

async function loadMuseumChartPayload(rvtr: string): Promise<MuseumChartPayload | null> {
  try {
    const track = await loadTrackPage(rvtr);
    if (!track) return null;
    return buildChartJourneyPresentationFromTrackPage(track);
  } catch {
    return null;
  }
}

async function loadRetrographPublicExperience(
  normalized: string,
): Promise<PublicExperiencePayload | null> {
  const [collector, songDna, chart, director, directorHandoff, retrograph] = await Promise.all([
    loadCollectorPackage(normalized),
    loadSongDnaPackage(normalized),
    loadMuseumChartPayload(normalized),
    loadDirectorPackage(normalized),
    loadDirectorHandoff(normalized),
    loadRetrograph(normalized),
  ]);

  if (!collector || !director?.renderSpec) return null;

  let rawSpec: unknown = director.renderSpec;
  try {
    rawSpec = JSON.parse(await readFile(directorRenderSpecPath(normalized), "utf8"));
  } catch {
    rawSpec = director.renderSpec;
  }

  const parsed = parseRenderSpec(rawSpec);
  if (!parsed) return null;

  const scenes = composeRetrographMobileExperience({
    experience: parsed,
    collector,
    retrograph,
    songDna,
    chart,
    directorHandoff,
  });

  if (scenes.length === 0) return null;

  const visualProduction = await loadVisualProduction(normalized);
  const producedScenes = applyVisualProductionToScenes(scenes, visualProduction);

  const { profile, themeVars, usedArtDirection } = safeArtDirection(parsed, songDna, normalized);

  return {
    experience: parsed,
    songDna,
    scenes: producedScenes,
    artDirection: profile,
    composition: null,
    themeVars,
    pipeline: {
      usedComposition: false,
      usedArtDirection,
      usedMuseum: false,
      usedVisualProducer: Boolean(visualProduction),
      originalSceneCount: director.experiencePlan.scenes.length,
      composedSceneCount: producedScenes.length,
    },
  };
}

async function loadMuseumPublicExperience(
  normalized: string,
  options?: LoadPublicExperienceOptions,
): Promise<PublicExperiencePayload | null> {
  const [collector, songDna, chart, director, directorHandoff, registry] =
    await Promise.all([
      loadCollectorPackage(normalized),
      loadSongDnaPackage(normalized),
      loadMuseumChartPayload(normalized),
      loadDirectorPackage(normalized),
      loadDirectorHandoff(normalized),
      loadMuseumPilotRegistry().catch(() => null),
    ]);

  if (!collector) return null;

  const appendExtended = true;

  const museum = composeMuseumExperience({
    collector,
    songDna,
    chart,
    directorPlan: director?.experiencePlan ?? null,
    directorHandoff,
    showcaseRvtr: showcaseRvtrFromRegistry(registry),
    appendExtended,
  });

  const visualProduction = await loadVisualProduction(normalized);
  const producedScenes = applyVisualProductionToScenes(museum.scenes, visualProduction);

  const { profile, themeVars, usedArtDirection } = safeArtDirection(
    museum.experience,
    songDna,
    normalized,
  );

  return {
    experience: museum.experience,
    songDna,
    scenes: producedScenes,
    artDirection: profile,
    composition: null,
    themeVars,
    pipeline: {
      usedComposition: false,
      usedArtDirection,
      usedMuseum: true,
      usedVisualProducer: Boolean(visualProduction),
      originalSceneCount: director?.experiencePlan.scenes.length ?? 5,
      composedSceneCount: producedScenes.length,
    },
  };
}

export type LoadPublicExperienceOptions = {
  /** Ops/training previews skip Publisher approval gate. */
  bypassPublisherGate?: boolean;
};

export async function loadPublicExperience(
  rvtr: string,
  options?: LoadPublicExperienceOptions,
): Promise<PublicExperiencePayload | null> {
  const normalized = normalizeRvtr(rvtr);
  if (!normalized) return null;

  if (!options?.bypassPublisherGate && !(await isExperiencePublished(normalized))) {
    return null;
  }

  const director = await loadDirectorPackage(normalized);
  const retrograph = await loadRetrograph(normalized);
  const usesRetrographPlan =
    Boolean(retrograph) ||
    director?.experiencePlan.templateLibraryVersion?.includes("retrograph") === true ||
    director?.experiencePlan.templateLibraryVersion?.includes("dossier") === true;

  if (usesRetrographPlan) {
    const retrographExperience = await loadRetrographPublicExperience(normalized);
    if (retrographExperience) return retrographExperience;
  }

  return loadMuseumPublicExperience(normalized, options);
}
