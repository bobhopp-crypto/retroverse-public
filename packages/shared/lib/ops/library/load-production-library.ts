import "server-only";

import { cache } from "react";
import { access } from "fs/promises";

import { slugFromArtistName } from "@/lib/artist/slug";
import { loadBrowserPlusModel } from "@/lib/ops/browser-plus/load-browser-plus";
import type { BrowserPlusRow } from "@/lib/ops/browser-plus/types";
import { isSongExperienceRenderable } from "@/lib/ops/intelligence/song-experience-renderability";
import { listRvtrDirectories, mapInBatches } from "@/lib/ops/studio/list-rvtrs";
import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import type { CollectorPackage } from "@/lib/ops/studio/collector/types";
import { visualAssetUrl } from "@/lib/ops/studio/collector/visual-asset-url";
import { editorOutputPath } from "@/lib/ops/studio/editor/paths";
import { loadEditorStory } from "@/lib/ops/studio/editor/store";
import { isPublisherApproved, loadPublisherStore } from "@/lib/ops/studio/publisher/store";
import type { PublisherRecord } from "@/lib/ops/studio/publisher/types";
import { readJsonFileSafe } from "@/lib/ops/studio/safe-io";
import { bundledSongPackageIndexPath } from "@/lib/ops/intelligence/paths";
import { albumSuggestionHref, trackPageHref } from "@/lib/search/entity-routes";
import {
  chartJourneyPath,
  patronExperiencePath,
} from "@/lib/retroverse/published-launch-paths";

import { buildLibraryCounts, computeSongHealth } from "./query";
import type {
  LibraryCollectorStatus,
  LibraryEditorStatus,
  LibraryPublisherStatus,
  ProductionLibraryData,
  ProductionLibrarySong,
} from "./types";

type PackageIndexEntry = {
  rvtr: string;
  status?: string;
  updatedAt?: string | null;
};

type VdjAggregate = {
  playCount: number;
  lastPlay: string | null;
  firstSeen: string | null;
  hasVideo: boolean;
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

function hasChartData(pkg: CollectorPackage): boolean {
  const weeks = pkg.charts?.chartWeeks ?? 0;
  const peak = pkg.charts?.peakHot100;
  return weeks > 0 || peak != null;
}

function hasCollectorVideo(pkg: CollectorPackage): boolean {
  const vdjVideos = pkg.virtualDj?.mediaItems?.some((item) => item.isVideo) ?? false;
  const performanceVideos = (pkg.videoPerformance?.items?.length ?? 0) > 0;
  return vdjVideos || performanceVideos;
}

function hasEditorStory(fullStory: string | null | undefined, headline: string | null | undefined): boolean {
  return Boolean(fullStory?.trim() || headline?.trim());
}

function maxIso(values: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  let bestMs = 0;
  for (const value of values) {
    if (!value) continue;
    const ms = Date.parse(value);
    if (!Number.isFinite(ms) || ms <= bestMs) continue;
    bestMs = ms;
    best = value;
  }
  return best;
}

function buildVdjAggregateMap(rows: BrowserPlusRow[]): Map<string, VdjAggregate> {
  const out = new Map<string, VdjAggregate>();
  for (const row of rows) {
    const rvtr = row.rvtr?.trim().toUpperCase();
    if (!rvtr) continue;
    const current = out.get(rvtr) ?? {
      playCount: 0,
      lastPlay: null,
      firstSeen: null,
      hasVideo: false,
    };
    current.playCount = Math.max(current.playCount, row.playCount ?? 0);
    current.hasVideo = current.hasVideo || row.isVideo;
    current.lastPlay = maxIso([current.lastPlay, row.lastPlay]);
    const firstSeen = row.firstSeen;
    if (firstSeen) {
      const currentMs = current.firstSeen ? Date.parse(current.firstSeen) : Number.POSITIVE_INFINITY;
      const nextMs = Date.parse(firstSeen);
      if (Number.isFinite(nextMs) && nextMs < currentMs) {
        current.firstSeen = firstSeen;
      }
    }
    out.set(rvtr, current);
  }
  return out;
}

async function loadPackageIndexMap(): Promise<Map<string, PackageIndexEntry>> {
  const parsed = await readJsonFileSafe<{ packages?: PackageIndexEntry[] } | null>(
    bundledSongPackageIndexPath(),
    null,
    2000,
  );
  const out = new Map<string, PackageIndexEntry>();
  for (const entry of parsed?.packages ?? []) {
    const rvtr = entry.rvtr?.trim().toUpperCase();
    if (!rvtr) continue;
    out.set(rvtr, entry);
  }
  return out;
}

async function buildProductionSong(
  rvtr: string,
  publisherByRvtr: Map<string, PublisherRecord>,
  vdjByRvtr: Map<string, VdjAggregate>,
  packageByRvtr: Map<string, PackageIndexEntry>,
): Promise<ProductionLibrarySong | null> {
  const pkg = await loadCollectorPackage(rvtr);
  if (!pkg) return null;

  const normalizedRvtr = pkg.rvtr.trim().toUpperCase();
  const year = pkg.identity?.year ?? null;
  const coverUrl = resolveCoverUrl(normalizedRvtr, pkg);
  const albumTitle = pkg.identity?.albumTitle ?? pkg.charts?.albumTitle ?? null;
  const vdj = vdjByRvtr.get(normalizedRvtr);
  const packageEntry = packageByRvtr.get(normalizedRvtr);

  const collectorPlayCount = pkg.virtualDj?.playCount ?? 0;
  const playCount = Math.max(collectorPlayCount ?? 0, vdj?.playCount ?? 0);

  const hasEditor = await fileExists(editorOutputPath(normalizedRvtr));
  let editorStatus: LibraryEditorStatus = "none";
  let hasStory = false;
  let editorUpdatedAt: string | null = null;
  if (hasEditor) {
    const editor = await loadEditorStory(normalizedRvtr);
    const submitted =
      editor?.meta.editorialStatus === "submitted" ||
      Boolean(editor?.meta.directorHandoff?.submittedAt);
    editorStatus = submitted ? "submitted" : "draft";
    hasStory = hasEditorStory(editor?.story.fullStory, editor?.story.headline);
    editorUpdatedAt = editor?.meta.updatedAt ?? editor?.meta.directorHandoff?.submittedAt ?? null;
  }

  const publisherRecord = publisherByRvtr.get(normalizedRvtr) ?? null;
  let publisherStatus: LibraryPublisherStatus = "none";
  if (publisherRecord?.evaluation) {
    publisherStatus = isPublisherApproved(publisherRecord) ? "published" : "evaluated";
  }
  const published = publisherStatus === "published";

  const collectorStatus: LibraryCollectorStatus = pkg.status;
  const hasChartJourney = hasChartData(pkg);
  const hasVideo = hasCollectorVideo(pkg) || Boolean(vdj?.hasVideo);
  const hasExperience = isSongExperienceRenderable(packageEntry?.status);

  const lastUpdated = maxIso([
    pkg.completedAt,
    editorUpdatedAt,
    packageEntry?.updatedAt ?? null,
    publisherRecord?.evaluation?.evaluatedAt ?? publisherRecord?.firstEvaluatedAt ?? null,
    publisherRecord?.publishedAt ?? publisherRecord?.approvedAt ?? null,
  ]);

  const health = computeSongHealth({
    collectorStatus,
    editorStatus,
    publisherStatus,
    coverUrl,
    hasChartJourney,
    hasStory,
    hasExperience,
    hasVideo,
  });

  const artistSlug = slugFromArtistName(pkg.artist);

  return {
    rvtr: normalizedRvtr,
    title: pkg.title,
    artist: pkg.artist,
    year,
    coverUrl,
    playCount,
    lastPlay: vdj?.lastPlay ?? null,
    firstSeen: vdj?.firstSeen ?? null,
    collectorStatus,
    editorStatus,
    publisherStatus,
    hasChartJourney,
    hasStory,
    hasExperience,
    hasVideo,
    lastUpdated,
    albumTitle,
    health,
    links: {
      song: trackPageHref(normalizedRvtr),
      editor: `/ops/studio/editor/${normalizedRvtr}`,
      collector: `/ops/studio/collector/${normalizedRvtr}`,
      artist: `/artist/${artistSlug}`,
      album: albumTitle ? albumSuggestionHref(albumTitle) : null,
      chartJourney: published
        ? chartJourneyPath(normalizedRvtr)
        : `/ops/studio/experiences/chart-journey/${normalizedRvtr}`,
      experience: published ? patronExperiencePath(normalizedRvtr) : null,
      vdjMatch: `/ops/browser-plus?q=${encodeURIComponent(normalizedRvtr)}`,
    },
  };
}

function compareDefault(a: ProductionLibrarySong, b: ProductionLibrarySong): number {
  return (
    b.playCount - a.playCount ||
    a.artist.localeCompare(b.artist, undefined, { sensitivity: "base" }) ||
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
  );
}

export const loadProductionLibrary = cache(async (): Promise<ProductionLibraryData> => {
  const [{ rvtrs }, publisherStore, browserPlusModel, packageByRvtr] = await Promise.all([
    listRvtrDirectories(),
    loadPublisherStore(),
    loadBrowserPlusModel(),
    loadPackageIndexMap(),
  ]);

  const publisherByRvtr = new Map(
    publisherStore.records.map((record) => [record.rvtr.trim().toUpperCase(), record]),
  );
  const vdjByRvtr = buildVdjAggregateMap(browserPlusModel.rows);

  const songs = (
    await mapInBatches(rvtrs, 32, (rvtr) =>
      buildProductionSong(rvtr, publisherByRvtr, vdjByRvtr, packageByRvtr),
    )
  )
    .filter((song): song is ProductionLibrarySong => song != null)
    .sort(compareDefault);

  const years = [...new Set(songs.map((song) => song.year).filter((year): year is number => year != null))]
    .sort((a, b) => b - a);

  return {
    generatedAt: new Date().toISOString(),
    songs,
    counts: buildLibraryCounts(songs),
    years,
  };
});
