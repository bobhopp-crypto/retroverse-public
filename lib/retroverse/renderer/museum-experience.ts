import type { CollectorPackage } from "@/lib/ops/studio/collector/types";
import { visualAssetUrl } from "@/lib/ops/studio/collector/visual-asset-url";
import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";
import type { DirectorEditorialPackage } from "@/lib/ops/studio/editor/types";
import type { ExperiencePlan } from "@/lib/ops/studio/director/types";
import {
  exhibitIdFromScene,
  isExtendedExhibitScene,
  releaseYearFromCoverScene,
  type ExhibitId,
} from "@/lib/ops/studio/director/exhibit-plan";
import { DIRECTOR_RENDER_SPEC_VERSION } from "@/lib/studio/package";
import { resolveSongDnaQuote } from "./song-dna-quote";
import { songDnaWatercolorDataUrl } from "./song-dna-watercolor";
import type {
  MuseumChartPayload,
  MuseumRoom,
  PresentableScene,
  PresentationLayout,
} from "./scene-presentation";
import type { DirectorRenderSpec } from "./types";
import type { ParsedExperience } from "./types";

export type { MuseumChartPayload, MuseumRoom };

export type MuseumExperienceInput = {
  collector: CollectorPackage;
  songDna: CollectorSongDna | null;
  chart: MuseumChartPayload | null;
  directorPlan?: ExperiencePlan | null;
  directorHandoff?: DirectorEditorialPackage | null;
  showcaseRvtr?: string;
  appendExtended?: boolean;
};

type FrameEntry = {
  url: string;
  category: string;
  assetId: string;
};

const CATEGORY_DIVERSITY = ["Hero", "Close-up", "Performance", "Alternate", "Crowd"] as const;

function extractedFrames(collector: CollectorPackage): FrameEntry[] {
  const perf = collector.performances?.[0];
  const assets =
    perf?.visualAssets.extraction.assets ?? collector.visualAssets.extraction.assets ?? [];

  return assets.map((asset) => ({
    url: visualAssetUrl(collector.rvtr, asset.filename),
    category: asset.category,
    assetId: asset.id,
  }));
}

function assetUrlMap(collector: CollectorPackage): Map<string, string> {
  const perf = collector.performances?.[0];
  const assets =
    perf?.visualAssets.extraction.assets ?? collector.visualAssets.extraction.assets ?? [];
  return new Map(assets.map((a) => [a.id, visualAssetUrl(collector.rvtr, a.filename)]));
}

function pickDiverseFrame(
  frames: FrameEntry[],
  prefer: readonly string[],
  exclude: Set<string>,
): FrameEntry | null {
  for (const category of prefer) {
    const match = frames.find((f) => f.category === category && !exclude.has(f.url));
    if (match) return match;
  }
  return frames.find((f) => !exclude.has(f.url)) ?? null;
}

function resolveFrameUrls(
  assetIds: string[],
  urlByAsset: Map<string, string>,
  frames: FrameEntry[],
  prefer: readonly string[],
  exclude: Set<string>,
): string[] {
  const urls: string[] = [];
  for (const id of assetIds) {
    const url = urlByAsset.get(id);
    if (url && !exclude.has(url)) {
      urls.push(url);
      exclude.add(url);
    }
  }
  if (urls.length === 0) {
    const picked = pickDiverseFrame(frames, prefer, exclude);
    if (picked) {
      urls.push(picked.url);
      exclude.add(picked.url);
    }
  }
  return urls;
}

function coverUrl(collector: CollectorPackage): string | null {
  return collector.song?.coverUrl ?? collector.visualAssets.coverUrl ?? null;
}

function releaseYear(collector: CollectorPackage, plan?: ExperiencePlan | null): number | null {
  const coverScene = plan?.scenes.find((s) => exhibitIdFromScene(s) === "cover");
  const fromPlan = coverScene ? releaseYearFromCoverScene(coverScene) : null;
  if (fromPlan) return fromPlan;
  const chartYear = collector.charts.summary?.match(/\b(19|20)\d{2}\b/)?.[0];
  if (chartYear) return Number(chartYear);
  return null;
}

function buildMinimalExperience(collector: CollectorPackage, sceneCount: number): ParsedExperience {
  const perf = collector.performances?.[0];
  const runtime = Math.max(30, sceneCount * 7);
  const spec = {
    version: DIRECTOR_RENDER_SPEC_VERSION,
    metadata: {
      rvtr: collector.rvtr,
      artist: collector.artist,
      title: collector.title,
      version: DIRECTOR_RENDER_SPEC_VERSION,
      generatedAt: new Date().toISOString(),
      estimatedRuntimeSec: runtime,
      presentationStyle: "documentary" as const,
      primaryPerformance: {
        performanceId: perf?.id ?? "primary",
        title: perf?.title ?? "Performance",
      },
      patronValue: null,
      storyQuality: null,
    },
    globalPresentation: {
      backgroundTreatment: "museum_dark",
      typographyProfile: "editorial_minimal",
      colorTheme: "museum",
      pacingProfile: "moderate" as const,
      imageTreatment: "original",
      orientation: "portrait_compatible" as const,
    },
    sceneTimeline: [],
    assetManifest: {
      hero: [],
      supportingImages: [],
      performanceImages: [],
      galleryImages: [],
      timelineData: [],
      charts: [],
      quotes: [],
      facts: [],
      logos: [],
    },
    renderingInstructions: {
      sceneOrder: [],
      autoAdvance: true,
      loopPresentation: false,
      respectDurationHints: true,
      notes: ["Director 2.0 — five museum exhibits"],
    },
    fallbackRules: [],
    renderReadiness: "ready_to_render" as const,
    renderReadinessLabel: "Museum exhibit experience",
    templateDowngradesApplied: 0,
    varietyAdjustmentsApplied: 0,
    estimatedRenderingConfidence: 0.92,
  } satisfies DirectorRenderSpec;

  return { spec, scenes: [], totalDurationSec: runtime };
}

function museumSceneBase(
  sceneNumber: number,
  room: MuseumRoom,
  layout: PresentationLayout,
  templateId: PresentableScene["templateId"],
  opts: {
    headline: string;
    imageUrls?: string[];
    durationSec?: number;
    momentType: PresentableScene["momentType"];
    momentLabel: string;
    coverUrl?: string | null;
    dnaWatercolorSvg?: string | null;
    museumDnaQuoteText?: string | null;
    museumDnaQuoteAttribution?: string | null;
    museumChart?: MuseumChartPayload | null;
    showcaseBadge?: boolean;
    imageTreatment?: PresentableScene["imageTreatment"];
    releaseYear?: number | null;
  },
): PresentableScene {
  return {
    sceneNumber,
    templateId,
    preferredTemplateId: templateId,
    templateDowngraded: false,
    varietyAdjusted: false,
    downgradeReason: null,
    durationSec: opts.durationSec ?? 7,
    headline: opts.headline,
    supportingCopy: "",
    narrativePurpose: "",
    importance: room === "cover" || room === "performance" || room === "iconic_moment" ? "high" : "medium",
    assets: {
      imageAssetIds: [],
      imageUrls: opts.imageUrls ?? [],
      factIds: [],
      factTexts: [],
      performanceId: null,
      timelineEvents: [],
    },
    transitionIn: "fade",
    transitionOut: "fade",
    layoutReadiness: "ready",
    selfContained: true,
    momentType: opts.momentType,
    momentLabel: opts.momentLabel,
    sourceSceneNumbers: [sceneNumber],
    visualIntensity: room === "song_dna" || room === "iconic_moment" ? "high" : room === "cover" ? "low" : "medium",
    composeReason: `museum:${room}`,
    presentationLayout: layout,
    imageTreatment: opts.imageTreatment ?? "original",
    museumRoom: room,
    coverUrl: opts.coverUrl ?? null,
    dnaWatercolorSvg: opts.dnaWatercolorSvg ?? null,
    museumDnaQuoteText: opts.museumDnaQuoteText ?? null,
    museumDnaQuoteAttribution: opts.museumDnaQuoteAttribution ?? null,
    museumChart: opts.museumChart ?? null,
    showcaseBadge: opts.showcaseBadge ?? false,
    releaseYear: opts.releaseYear ?? null,
  };
}

function exhibitLayout(id: ExhibitId): {
  room: MuseumRoom;
  layout: PresentationLayout;
  templateId: PresentableScene["templateId"];
} {
  switch (id) {
    case "cover":
      return { room: "cover", layout: "museum_identity", templateId: "hero" };
    case "chart_journey":
      return { room: "chart_journey", layout: "museum_chart", templateId: "chart" };
    case "iconic_moment":
      return { room: "iconic_moment", layout: "museum_iconic", templateId: "gallery" };
    case "song_dna":
      return { room: "song_dna", layout: "museum_dna", templateId: "gallery" };
    case "performance":
      return { room: "performance", layout: "museum_performance", templateId: "performance" };
  }
}

function buildStandardExhibits(input: MuseumExperienceInput): PresentableScene[] {
  const { collector, songDna, chart, directorPlan, showcaseRvtr = "RVTR417030" } = input;
  const frames = extractedFrames(collector);
  const urlByAsset = assetUrlMap(collector);
  const used = new Set<string>();
  const year = releaseYear(collector, directorPlan);
  const albumCover = coverUrl(collector);
  const watercolor = songDna ? songDnaWatercolorDataUrl(songDna) : null;
  const isShowcase = collector.rvtr.trim().toUpperCase() === showcaseRvtr.trim().toUpperCase();

  const planSlots = directorPlan?.scenes.filter((s) => exhibitIdFromScene(s)) ?? [];
  const exhibitOrder: ExhibitId[] = ["cover", "chart_journey", "iconic_moment", "song_dna", "performance"];

  const scenes: PresentableScene[] = [];
  let sceneNumber = 1;

  for (const exhibitId of exhibitOrder) {
    const planScene = planSlots.find((s) => exhibitIdFromScene(s) === exhibitId);
    const { room, layout, templateId } = exhibitLayout(exhibitId);

    if (exhibitId === "cover") {
      scenes.push(
        museumSceneBase(sceneNumber++, room, layout, templateId, {
          headline: collector.title,
          coverUrl: albumCover,
          momentType: "hero_moment",
          momentLabel: "Cover",
          durationSec: 6,
          showcaseBadge: isShowcase,
          releaseYear: year,
        }),
      );
      continue;
    }

    if (exhibitId === "song_dna") {
      if (!watercolor) continue;
      const dnaQuote = resolveSongDnaQuote(
        input.collector,
        input.directorHandoff?.approvedQuotes ?? [],
      );
      scenes.push(
        museumSceneBase(sceneNumber++, room, layout, templateId, {
          headline: "",
          dnaWatercolorSvg: watercolor,
          museumDnaQuoteText: dnaQuote?.text ?? null,
          museumDnaQuoteAttribution: dnaQuote?.attribution ?? null,
          momentType: "visual_break",
          momentLabel: "Song DNA",
          durationSec: 7,
        }),
      );
      continue;
    }

    const prefer =
      exhibitId === "iconic_moment"
        ? ["Close-up", "Alternate", "Performance", "Hero", "Crowd"]
        : exhibitId === "chart_journey"
          ? ["Hero", "Performance", "Alternate", "Crowd"]
          : ["Performance", "Hero", "Close-up", "Alternate", "Crowd"];

    const assetIds = planScene?.linkedImageAssetIds ?? [];
    const imageUrls = resolveFrameUrls(assetIds, urlByAsset, frames, prefer, used);

    if (imageUrls.length === 0 && exhibitId !== "chart_journey") continue;

    if (exhibitId === "chart_journey") {
      const hasChart = chart != null || collector.charts.peakHot100 != null;
      if (!hasChart && imageUrls.length === 0) continue;

      scenes.push(
        museumSceneBase(sceneNumber++, room, layout, templateId, {
          headline: "",
          imageUrls,
          museumChart: chart,
          momentType: "chart_milestone",
          momentLabel: "Chart Journey",
          durationSec: 9,
          imageTreatment: "original",
        }),
      );
      continue;
    }

    if (exhibitId === "iconic_moment") {
      const headline = planScene?.headline?.trim().slice(0, 48) ?? "";
      scenes.push(
        museumSceneBase(sceneNumber++, room, layout, templateId, {
          headline,
          imageUrls,
          momentType: "visual_break",
          momentLabel: "Iconic Moment",
          durationSec: 8,
          imageTreatment: "poster",
        }),
      );
      continue;
    }

    scenes.push(
      museumSceneBase(sceneNumber++, room, layout, templateId, {
        headline: "",
        imageUrls,
        momentType: "performance_spotlight",
        momentLabel: "Performance",
        durationSec: 8,
        imageTreatment: "original",
      }),
    );
  }

  return scenes;
}

function buildExtendedExhibits(input: MuseumExperienceInput, startNumber: number): PresentableScene[] {
  if (!input.appendExtended || !input.directorPlan) return [];

  const frames = extractedFrames(input.collector);
  const urlByAsset = assetUrlMap(input.collector);
  const used = new Set<string>(
    buildStandardExhibits({ ...input, appendExtended: false }).flatMap((s) => s.assets.imageUrls),
  );

  const extendedScenes = input.directorPlan.scenes.filter(isExtendedExhibitScene);
  const out: PresentableScene[] = [];

  for (const planScene of extendedScenes) {
    const imageUrls = resolveFrameUrls(
      planScene.linkedImageAssetIds,
      urlByAsset,
      frames,
      CATEGORY_DIVERSITY,
      used,
    );
    if (imageUrls.length === 0) continue;

    out.push(
      museumSceneBase(startNumber + out.length, "extended", "museum_iconic", "gallery", {
        headline: planScene.headline.slice(0, 48),
        imageUrls,
        momentType: "visual_break",
        momentLabel: planScene.title.replace(/^Extended — /, ""),
        durationSec: planScene.estimatedDurationSec,
        imageTreatment: "original",
      }),
    );
  }

  return out;
}

/** Five fixed museum exhibits — Director 2.0 standard path. */
export function composeMuseumExperience(input: MuseumExperienceInput): {
  experience: ParsedExperience;
  scenes: PresentableScene[];
} {
  const standard = buildStandardExhibits(input);
  const extended = buildExtendedExhibits(input, standard.length + 1);
  const scenes = [...standard, ...extended];

  const experience = buildMinimalExperience(input.collector, scenes.length);
  experience.totalDurationSec = scenes.reduce((sum, scene) => sum + scene.durationSec, 0);
  experience.spec.metadata.estimatedRuntimeSec = experience.totalDurationSec;

  return { experience, scenes };
}

export function museumAdjacentDuplicateImages(scenes: PresentableScene[]): number {
  let count = 0;
  for (let i = 1; i < scenes.length; i += 1) {
    const prev = visualKeyForScene(scenes[i - 1]!);
    const curr = visualKeyForScene(scenes[i]!);
    if (prev && curr && prev === curr) count += 1;
  }
  return count;
}

function visualKeyForScene(scene: PresentableScene): string | null {
  if (scene.museumRoom === "cover") return scene.coverUrl ?? null;
  if (scene.museumRoom === "song_dna") return scene.dnaWatercolorSvg ?? "dna";
  return scene.assets.imageUrls[0] ?? null;
}
