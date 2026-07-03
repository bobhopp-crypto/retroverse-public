import "server-only";

import { access, readdir, readFile } from "fs/promises";
import { join } from "path";

import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import { isExperiencePublished } from "@/lib/ops/studio/publisher/gate";
import { buildChartJourneyExperience } from "@/lib/experiences/chart-journey/build-experience";
import { buildSongDnaExperience } from "@/lib/experiences/song-dna/build-experience";
import { bundledIntelligenceRoot } from "@/lib/ops/intelligence/paths";
import { loadTrackPage } from "@/lib/track/load-track-page";
import { normalizeRvtr } from "@/lib/studio/status";

import type {
  GalleryExperienceReadiness,
  GalleryLibraryProgress,
  GallerySongContext,
} from "./gallery-types";
import { getGalleryExperience } from "./experience-registry";
import {
  galleryInstrumentEnabled,
  galleryLog,
  galleryTime,
  galleryTimeEnd,
} from "./gallery-instrument";

export type { GalleryExperienceReadiness, GallerySongContext, GalleryLibraryProgress } from "./gallery-types";

export async function evaluateGalleryExperience(
  experienceId: string,
  rvtrInput: string,
): Promise<GalleryExperienceReadiness> {
  const rvtr = normalizeRvtr(rvtrInput);
  const def = getGalleryExperience(experienceId);
  if (!rvtr || !def) {
    return {
      id: experienceId,
      available: false,
      completionPct: 0,
      sceneCount: null,
      creativeReviewScore: null,
      productionScore: null,
      lastUpdated: null,
      launchHref: null,
      statusLabel: "Unavailable",
    };
  }

  if (def.status === "coming_soon" || def.status === "planned") {
    return {
      id: experienceId,
      available: false,
      completionPct: 0,
      sceneCount: null,
      creativeReviewScore: null,
      productionScore: null,
      lastUpdated: null,
      launchHref: null,
      statusLabel: def.status === "planned" ? "Planned" : "Coming Soon",
    };
  }

  let available = false;
  let completionPct = 0;
  let sceneCount: number | null = null;
  let creativeReviewScore: number | null = null;
  let productionScore: number | null = null;
  let lastUpdated: string | null = null;

  if (experienceId === "chart_journey") {
    if (galleryInstrumentEnabled()) galleryTime(`[gallery-instrument] buildChartJourneyExperience ${rvtr}`);
    const exp = await buildChartJourneyExperience(rvtr);
    if (galleryInstrumentEnabled()) galleryTimeEnd(`[gallery-instrument] buildChartJourneyExperience ${rvtr}`);
    available = Boolean(exp);
    if (exp) {
      completionPct = Math.round((exp.chapters.length / 12) * 100);
      sceneCount = exp.chapters.length;
      creativeReviewScore = exp.review.overallScore;
      lastUpdated = exp.generatedAt;
    }
  } else if (experienceId === "song_dna") {
    if (galleryInstrumentEnabled()) galleryTime(`[gallery-instrument] buildSongDnaExperience ${rvtr}`);
    const exp = await buildSongDnaExperience(rvtr);
    if (galleryInstrumentEnabled()) galleryTimeEnd(`[gallery-instrument] buildSongDnaExperience ${rvtr}`);
    available = Boolean(exp);
    if (exp) {
      completionPct = Math.round((exp.chapters.length / 9) * 100);
      sceneCount = exp.chapters.length;
      creativeReviewScore = exp.review.overallScore;
      productionScore = exp.productionReadiness.score;
      lastUpdated = exp.generatedAt;
    }
  } else {
    const track = await loadTrackPage(rvtr);
    available = Boolean(track);
    completionPct = track ? 40 : 0;
  }

  const needsPublication = experienceId === "song_dna";
  const published = needsPublication ? await isExperiencePublished(rvtr) : true;

  const launchHref =
    def.launchPath && available && (!needsPublication || published)
      ? def.launchPath(rvtr)
      : null;

  return {
    id: experienceId,
    available,
    completionPct,
    sceneCount,
    creativeReviewScore,
    productionScore,
    lastUpdated,
    launchHref,
    statusLabel: launchHref ? "Ready" : available ? "In Progress" : "Needs Data",
  };
}

export async function loadGallerySongContext(rvtrInput: string): Promise<GallerySongContext | null> {
  const trace = galleryInstrumentEnabled();
  const rvtr = normalizeRvtr(rvtrInput);
  if (!rvtr) return null;

  if (trace) galleryTime(`[gallery-instrument] loadGallerySongContext parallel IO ${rvtr}`);
  const [track, collector, published] = await Promise.all([
    loadTrackPage(rvtr).finally(() => {
      if (trace) galleryLog(`[gallery-instrument] loadTrackPage done ${rvtr}`);
    }),
    loadCollectorPackage(rvtr).finally(() => {
      if (trace) galleryLog(`[gallery-instrument] loadCollectorPackage done ${rvtr}`);
    }),
    isExperiencePublished(rvtr).finally(() => {
      if (trace) galleryLog(`[gallery-instrument] isExperiencePublished done ${rvtr}`);
    }),
  ]);
  if (trace) galleryTimeEnd(`[gallery-instrument] loadGallerySongContext parallel IO ${rvtr}`);

  if (!track && !collector) return null;

  const signatureIds = [
    "chart_journey",
    "song_dna",
    "recording_journey",
    "performance_journey",
    "artist_journey",
    "album_journey",
    "legacy_journey",
  ];

  if (trace) galleryTime(`[gallery-instrument] evaluateGalleryExperience x${signatureIds.length} ${rvtr}`);
  const experiences = await Promise.all(
    signatureIds.map(async (id) => {
      if (trace) galleryTime(`[gallery-instrument] evaluateGalleryExperience ${id}`);
      const result = await evaluateGalleryExperience(id, rvtr);
      if (trace) galleryTimeEnd(`[gallery-instrument] evaluateGalleryExperience ${id}`);
      return result;
    }),
  );
  if (trace) galleryTimeEnd(`[gallery-instrument] evaluateGalleryExperience x${signatureIds.length} ${rvtr}`);

  return {
    rvtr,
    title: track?.title ?? collector?.title ?? rvtr,
    artist: track?.artistName ?? collector?.artist ?? "Unknown",
    year: track?.releaseYear ?? collector?.identity?.year ?? null,
    album: collector?.identity?.albumTitle ?? collector?.charts?.albumTitle ?? track?.albums[0]?.title ?? null,
    coverUrl: track?.coverUrl ?? collector?.visualAssets?.coverUrl ?? null,
    peakHot100: track?.peakHot100 ?? collector?.charts?.peakHot100 ?? null,
    chartWeeks: track?.chartWeeks ?? collector?.charts?.chartWeeks ?? null,
    published,
    experiences,
  };
}

export async function loadGalleryLibraryProgress(): Promise<GalleryLibraryProgress[]> {
  const trace = galleryInstrumentEnabled();
  if (trace) galleryTime("[gallery-instrument] loadGalleryLibraryProgress scan");
  const root = join(bundledIntelligenceRoot(), "research-department");
  let dirCount = 0;
  let songDnaCount = 0;
  let collectorChartCount = 0;

  try {
    const dirs = await readdir(root);
    for (const dir of dirs) {
      if (!/^RVTR\d{6}$/i.test(dir)) continue;
      dirCount += 1;
      try {
        await access(join(root, dir, "song-dna.json"));
        songDnaCount += 1;
      } catch {
        /* no song dna */
      }
      try {
        const raw = await readFile(join(root, dir, "collector.json"), "utf8");
        const pkg = JSON.parse(raw) as { charts?: { peakHot100?: number | null } };
        if (pkg.charts?.peakHot100 != null) collectorChartCount += 1;
      } catch {
        /* no collector */
      }
    }
  } catch {
    dirCount = 0;
  }

  if (trace) {
    galleryTimeEnd("[gallery-instrument] loadGalleryLibraryProgress scan");
    galleryLog("[gallery-instrument] library progress scan complete", {
      dirCount,
      songDnaCount,
      collectorChartCount,
    });
  }

  return [
    { experienceId: "chart_journey", title: "Chart Journey", completeCount: collectorChartCount, status: "ready" },
    { experienceId: "song_dna", title: "Song DNA", completeCount: songDnaCount, status: "ready" },
    { experienceId: "recording_journey", title: "Recording Journey", completeCount: Math.floor(dirCount * 0.12), status: "coming_soon" },
    { experienceId: "performance_journey", title: "Performance Journey", completeCount: Math.floor(dirCount * 0.05), status: "coming_soon" },
    { experienceId: "artist_journey", title: "Artist Journey", completeCount: 0, status: "planned" },
    { experienceId: "album_journey", title: "Album Journey", completeCount: 0, status: "planned" },
    { experienceId: "legacy_journey", title: "Legacy Journey", completeCount: 0, status: "planned" },
  ];
}
