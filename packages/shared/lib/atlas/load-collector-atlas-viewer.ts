import "server-only";

import { cache } from "react";
import { access } from "fs/promises";

import { eraAnchorForYear } from "@/lib/ops/studio/production/filter-by-era";
import { listRvtrDirectories, mapInBatches } from "@/lib/ops/studio/list-rvtrs";
import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import { visualAssetUrl } from "@/lib/ops/studio/collector/visual-asset-url";
import type { CollectorPackage } from "@/lib/ops/studio/collector/types";
import { editorOutputPath } from "@/lib/ops/studio/editor/paths";
import { loadEditorStory } from "@/lib/ops/studio/editor/store";
import { isPublisherApproved, loadPublisherStore } from "@/lib/ops/studio/publisher/store";
import type { PublisherRecord } from "@/lib/ops/studio/publisher/types";
import {
  chartJourneyPath,
  patronExperiencePath,
} from "@/lib/retroverse/published-launch-paths";

export type AtlasEraAnchor = 1980 | 1990 | 2005;

export type AtlasCollectorStatus = "complete" | "partial";
export type AtlasEditorStatus = "none" | "draft" | "submitted";
export type AtlasPublisherStatus = "none" | "evaluated" | "published";

export type AtlasCollectorSong = {
  rvtr: string;
  title: string;
  artist: string;
  year: number | null;
  era: AtlasEraAnchor | null;
  coverUrl: string | null;
  collectorStatus: AtlasCollectorStatus;
  editorStatus: AtlasEditorStatus;
  publisherStatus: AtlasPublisherStatus;
  factCount: number;
  mediaCount: number;
  hasChartJourney: boolean;
  links: {
    collector: string;
    editor: string;
    chartJourney: string;
    patron: string | null;
  };
};

export type AtlasCollectorViewerCounts = {
  total: number;
  collectorComplete: number;
  needsEditor: number;
  published: number;
  hasChartJourney: number;
  missingCover: number;
  era1980: number;
  era1990: number;
  era2005: number;
};

export type AtlasCollectorViewerData = {
  generatedAt: string;
  songs: AtlasCollectorSong[];
  counts: AtlasCollectorViewerCounts;
};

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function resolveCoverUrl(rvtr: string, pkg: CollectorPackage): string | null {
  const hero = pkg.visualAssets?.extraction?.assets?.find((asset) => asset.category === "Hero");
  if (hero?.filename) return visualAssetUrl(rvtr, hero.filename);
  return pkg.visualAssets?.coverUrl ?? null;
}

function resolveMediaCount(pkg: CollectorPackage): number {
  const vdjCount = pkg.virtualDj?.mediaItems?.length ?? 0;
  const videoCount = pkg.videoPerformance?.items?.length ?? 0;
  return Math.max(vdjCount, videoCount);
}

function hasChartData(pkg: CollectorPackage): boolean {
  const weeks = pkg.charts?.chartWeeks ?? 0;
  const peak = pkg.charts?.peakHot100;
  return weeks > 0 || peak != null;
}

async function buildAtlasSong(
  rvtr: string,
  publisherByRvtr: Map<string, PublisherRecord>,
): Promise<AtlasCollectorSong | null> {
  const pkg = await loadCollectorPackage(rvtr);
  if (!pkg) return null;

  const normalizedRvtr = pkg.rvtr.trim().toUpperCase();
  const year = pkg.identity?.year ?? null;
  const era = eraAnchorForYear(year);
  const coverUrl = resolveCoverUrl(normalizedRvtr, pkg);

  const hasEditor = await fileExists(editorOutputPath(normalizedRvtr));
  let editorStatus: AtlasEditorStatus = "none";
  if (hasEditor) {
    const editor = await loadEditorStory(normalizedRvtr);
    const submitted =
      editor?.meta.editorialStatus === "submitted" ||
      Boolean(editor?.meta.directorHandoff?.submittedAt);
    editorStatus = submitted ? "submitted" : "draft";
  }

  const publisherRecord = publisherByRvtr.get(normalizedRvtr) ?? null;
  let publisherStatus: AtlasPublisherStatus = "none";
  if (publisherRecord?.evaluation) {
    publisherStatus = isPublisherApproved(publisherRecord) ? "published" : "evaluated";
  }

  const published = publisherStatus === "published";

  return {
    rvtr: normalizedRvtr,
    title: pkg.title,
    artist: pkg.artist,
    year,
    era,
    coverUrl,
    collectorStatus: pkg.status,
    editorStatus,
    publisherStatus,
    factCount: pkg.candidateFacts?.length ?? 0,
    mediaCount: resolveMediaCount(pkg),
    hasChartJourney: hasChartData(pkg),
    links: {
      collector: `/ops/studio/collector/${normalizedRvtr}`,
      editor: `/ops/studio/editor/${normalizedRvtr}`,
      chartJourney: published
        ? chartJourneyPath(normalizedRvtr)
        : `/ops/studio/experiences/chart-journey/${normalizedRvtr}`,
      patron: published ? patronExperiencePath(normalizedRvtr) : null,
    },
  };
}

function buildCounts(songs: AtlasCollectorSong[]): AtlasCollectorViewerCounts {
  return {
    total: songs.length,
    collectorComplete: songs.filter((song) => song.collectorStatus === "complete").length,
    needsEditor: songs.filter((song) => song.editorStatus === "none").length,
    published: songs.filter((song) => song.publisherStatus === "published").length,
    hasChartJourney: songs.filter((song) => song.hasChartJourney).length,
    missingCover: songs.filter((song) => !song.coverUrl).length,
    era1980: songs.filter((song) => song.era === 1980).length,
    era1990: songs.filter((song) => song.era === 1990).length,
    era2005: songs.filter((song) => song.era === 2005).length,
  };
}

function compareSongs(a: AtlasCollectorSong, b: AtlasCollectorSong): number {
  return (
    a.artist.localeCompare(b.artist, undefined, { sensitivity: "base" }) ||
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
  );
}

export const loadCollectorAtlasViewer = cache(async (): Promise<AtlasCollectorViewerData> => {
  const [{ rvtrs }, publisherStore] = await Promise.all([
    listRvtrDirectories(),
    loadPublisherStore(),
  ]);

  const publisherByRvtr = new Map(
    publisherStore.records.map((record) => [record.rvtr.trim().toUpperCase(), record]),
  );

  const songs = (
    await mapInBatches(rvtrs, 32, (rvtr) => buildAtlasSong(rvtr, publisherByRvtr))
  )
    .filter((song): song is AtlasCollectorSong => song != null)
    .sort(compareSongs);

  return {
    generatedAt: new Date().toISOString(),
    songs,
    counts: buildCounts(songs),
  };
});
