/**
 * Collector 3.0 — derives song archive + performances from pipeline output.
 * Presentation-only: does not mutate on-disk collector.json (v1).
 */

import type {
  CollectorPackage,
  CollectorPerformance,
  CollectorSongArchive,
  CollectorSourceLogEntry,
  CollectorVdjMediaItem,
  CollectorVisualAssetExtraction,
} from "./types";
import { buildCanonicalModel, scopeResearchFacts } from "./identity-resolution";

function emptyExtraction(): CollectorVisualAssetExtraction {
  return {
    skipped: true,
    skipReason: "Visual assets have not been prepared yet",
    sourceVideo: null,
    frameIntervalSec: 20,
    extractedCount: 0,
    assets: [],
  };
}

function performanceIdFromPath(filePath: string): string {
  let hash = 0;
  for (let i = 0; i < filePath.length; i += 1) {
    hash = (hash * 31 + filePath.charCodeAt(i)) | 0;
  }
  return `perf-${Math.abs(hash).toString(36)}`;
}

function normPath(path: string): string {
  return path.replace(/\\/g, "/").trim().toLowerCase();
}

function performanceTitle(item: CollectorVdjMediaItem, songTitle: string): string {
  if (item.performanceLabel?.trim()) return item.performanceLabel.trim();
  const paren = item.title.match(/\(([^)]+)\)/);
  if (paren?.[1]?.trim()) return paren[1].trim();
  if (/live/i.test(item.filePath) || /live/i.test(item.title)) return "Live";
  if (item.title.trim().toLowerCase() !== songTitle.trim().toLowerCase()) {
    return item.title.replace(songTitle, "").replace(/[()\-–—]/g, "").trim() || "Alternate";
  }
  return "Official Video";
}

function detectedVenue(label: string | null, filePath: string): string | null {
  if (label?.trim()) return label.trim();
  const paren = filePath.match(/\(([^)]+)\)/);
  if (paren?.[1] && !/live|official|video|remaster/i.test(paren[1])) return paren[1].trim();
  return null;
}

function performanceQualityScore(
  item: CollectorVdjMediaItem,
  hasVisualAssets: boolean,
): number {
  let score = 40;
  if (item.playCount != null && item.playCount > 0) score += 15;
  if (item.year != null) score += 10;
  if (item.performanceLabel) score += 15;
  if (hasVisualAssets) score += 20;
  return Math.min(100, score);
}

function performanceConfidence(item: CollectorVdjMediaItem, hasVisualAssets: boolean): number {
  let score = 0.45;
  if (item.performanceLabel) score += 0.2;
  if (item.year != null) score += 0.1;
  if (hasVisualAssets) score += 0.2;
  if (item.playCount != null && item.playCount > 0) score += 0.05;
  return Math.min(1, Math.round(score * 100) / 100);
}

function performanceNotes(item: CollectorVdjMediaItem, hasVisualAssets: boolean): string {
  const parts: string[] = [];
  if (item.performanceLabel) parts.push(`Performance label: ${item.performanceLabel}.`);
  if (item.year != null) parts.push(`Detected year: ${item.year}.`);
  if (item.playCount != null && item.playCount > 0) {
    parts.push(`VirtualDJ play count: ${item.playCount}.`);
  }
  if (hasVisualAssets) parts.push("Curated visual reference frames extracted from this footage.");
  else parts.push("Visual asset extraction not yet run for this performance.");
  if (parts.length === 0) return "Performance on file — awaiting deeper investigation.";
  return parts.join(" ");
}

function performanceFacts(item: CollectorVdjMediaItem, hasVisualAssets: boolean): string[] {
  const facts: string[] = [];
  if (item.isVideo) facts.push("Matched VirtualDJ performance video");
  if (item.performanceLabel) facts.push(`Venue or tour: ${item.performanceLabel}`);
  if (item.year != null) facts.push(`Performance year: ${item.year}`);
  if (hasVisualAssets) facts.push("Visual reference library prepared");
  return facts;
}

export function deriveSongArchive(pkg: CollectorPackage): CollectorSongArchive {
  return {
    identity: pkg.identity ?? {
      rvtr: pkg.rvtr,
      artist: pkg.artist,
      title: pkg.title,
      year: null,
      albumTitle: null,
    },
    charts: pkg.charts ?? {
      peakHot100: null,
      chartWeeks: null,
      albumTitle: null,
      summary: "",
    },
    recording: pkg.recording ?? { summary: "", notes: [] },
    relationships: pkg.relationships ?? { relatedArtists: [], summary: "" },
    culture: pkg.culturalContext ?? { summary: "", notes: [] },
    sources: {
      sourceLog: Array.isArray(pkg.sourceLog) ? pkg.sourceLog : [],
      summary: pkg.summary ?? { researchSummary: "", sourceSummary: "" },
    },
    candidateFacts: Array.isArray(pkg.candidateFacts) ? pkg.candidateFacts : [],
    missingAreas: Array.isArray(pkg.missingAreas) ? pkg.missingAreas : [],
    identityNotes: Array.isArray(pkg.identityNotes) ? pkg.identityNotes : [],
    coverUrl: pkg.visualAssets?.coverUrl ?? null,
  };
}

export function derivePerformances(pkg: CollectorPackage): CollectorPerformance[] {
  if (Array.isArray(pkg.performances) && pkg.performances.length > 0) {
    return pkg.performances;
  }

  const videoItems = (pkg.videoPerformance?.items ?? []).filter((item) => item.isVideo);
  const primaryPath =
    pkg.videoPerformance?.preferredPerformance ??
    pkg.virtualDj?.primaryPath ??
    null;
  const extraction = pkg.visualAssets?.extraction ?? emptyExtraction();
  const extractionSource = extraction.sourceVideo ?? primaryPath;

  if (videoItems.length === 0) {
    return [];
  }

  return videoItems.map((item) => {
    const isPrimary =
      (primaryPath != null && normPath(item.filePath) === normPath(primaryPath)) ||
      (extractionSource != null && normPath(item.filePath) === normPath(extractionSource));
    const perfExtraction = isPrimary ? extraction : emptyExtraction();
    const hasVisualAssets = perfExtraction.extractedCount > 0;

    return {
      id: performanceIdFromPath(item.filePath),
      title: performanceTitle(item, pkg.title),
      sourceVideo: item.isVideo ? item.filePath : null,
      virtualDjFilePath: item.filePath,
      durationSec: null,
      qualityScore: performanceQualityScore(item, hasVisualAssets),
      visualAssets: { extraction: perfExtraction },
      collectorNotes: performanceNotes(item, hasVisualAssets),
      detectedVenue: detectedVenue(item.performanceLabel, item.filePath),
      detectedYear: item.year ?? null,
      confidence: performanceConfidence(item, hasVisualAssets),
      facts: performanceFacts(item, hasVisualAssets),
    };
  });
}

export function defaultPerformanceId(performances: CollectorPerformance[]): string | null {
  return performances[0]?.id ?? null;
}

export function findPerformance(
  pkg: CollectorPackage,
  performanceId: string | null | undefined,
): CollectorPerformance | null {
  const list = pkg.performances ?? derivePerformances(pkg);
  if (!performanceId) return list[0] ?? null;
  return list.find((p) => p.id === performanceId) ?? list[0] ?? null;
}

export function attachArchiveStructure(pkg: CollectorPackage): CollectorPackage {
  const song = pkg.song ?? deriveSongArchive(pkg);
  const performances =
    Array.isArray(pkg.performances) && pkg.performances.length > 0
      ? pkg.performances
      : derivePerformances(pkg);

  const base: CollectorPackage = {
    ...pkg,
    version: pkg.version >= 4 ? 4 : pkg.version >= 3 ? 3 : 2,
    song,
    performances,
  };

  if (base.canonical?.song && base.yearResolution) {
    return base;
  }

  const canonical = buildCanonicalModel(base, performances);
  const candidateFacts = scopeResearchFacts(base.candidateFacts, canonical, performances);

  return {
    ...base,
    version: 4,
    candidateFacts,
    songEntity: canonical.song,
    recordings: canonical.recordings,
    performanceEntities: canonical.performances,
    timelines: canonical.timelines,
    yearResolution: canonical.yearResolution,
    canonical,
  };
}

export function performanceCount(pkg: CollectorPackage): number {
  return (pkg.performances ?? derivePerformances(pkg)).length;
}

export function performanceTitles(pkg: CollectorPackage): string[] {
  return (pkg.performances ?? derivePerformances(pkg)).map((p) => p.title);
}
