import { loadBatchStatus } from "./batch-status";
import { computeArtifactReadiness, packageConfidence } from "./artifact-readiness";
import { loadCoverInfoForRvtrs } from "./load-rvtr-covers";
import { hydratePackageIntel } from "./package-intel";
import { loadSongPackage } from "./song-package-store";
import { auditVideoIdentification } from "./video-identification";
import {
  computeVideoPriorityScore,
  loadVideoPriorityContext,
} from "./video-priority-score";
import { vdjDatabasePath } from "./vdj-database";
import { loadVideoUniverse } from "./video-universe";
import type { VdjLibraryEntry } from "./vdj-database";

export type BackfillCoverage = VideoBackfillCoverage;

export type VideoBackfillCoverage = {
  scannedAt: string;
  vdjDatabasePath: string;
  parseMs: number;
  /** VIDEO/ folder only */
  videosInLibrary: number;
  videosWithRvtr: number;
  videosUnlinked: number;
  linkedPct: number;
  uniqueRvtrs: number;
  videosWithCover: number;
  coverPct: number;
  videosWithPackage: number;
  packagePct: number;
  videosWithArtifacts: number;
  artifactPct: number;
  retroverseReady: number;
  retroverseReadyPct: number;
  intelligenceEligible: number;
  missingLinks: number;
  missingCovers: number;
  missingPackages: number;
  failedProcessing: number;
  avgConfidence: number;
  estimatedMinutesNext10: number;
  /** Multi-bucket identification audit */
  identification: {
    directRvtr: number;
    pathMatch: number;
    coverMatch: number;
    titleArtistMatch: number;
    totalIdentifiable: number;
    researchReady: number;
    packageReady: number;
  };
};

export type VideoBackfillEntry = {
  rvtr: string;
  title: string;
  artist: string;
  playCount: number;
  filePath: string;
  year: number | null;
  genre: string;
  hasCover: boolean;
  coverUrl: string | null;
  coverSource: string | null;
  hasPackage: boolean;
  published: boolean;
  artifactsReady: boolean;
  retroverseReady: boolean;
  confidence: number;
  status: string | null;
  priorityScore: number;
  identifiable: boolean;
  researchReady: boolean;
};

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function hasIntelligencePackage(status: string | null, storyCardCount: number): boolean {
  if (!status) return false;
  if (storyCardCount > 0) return true;
  return status === "published" || status === "cards_ready" || status === "approved";
}

async function loadRvtrPackageMap(rvtrs: string[]) {
  const map = new Map<
    string,
    {
      hasPackage: boolean;
      published: boolean;
      artifactsReady: boolean;
      confidence: number;
      status: string | null;
      storyCardCount: number;
    }
  >();

  for (const rvtr of rvtrs) {
    const pkg = await loadSongPackage(rvtr);
    if (!pkg) {
      map.set(rvtr, {
        hasPackage: false,
        published: false,
        artifactsReady: false,
        confidence: 0,
        status: null,
        storyCardCount: 0,
      });
      continue;
    }
    const hydrated = hydratePackageIntel(pkg);
    const artifacts = computeArtifactReadiness(hydrated);
    const storyCardCount = pkg.storyCards.filter((c) => c.rank > 0).length;
    map.set(rvtr, {
      hasPackage: hasIntelligencePackage(pkg.status, storyCardCount),
      published: pkg.status === "published",
      artifactsReady: artifacts.allReady,
      confidence: packageConfidence(hydrated),
      status: pkg.status,
      storyCardCount,
    });
  }

  return map;
}

export async function loadVideoBackfillCoverage(): Promise<{
  coverage: VideoBackfillCoverage;
  videos: VideoBackfillEntry[];
}> {
  const universe = await loadVideoUniverse();
  const videoEntries = universe.videos;
  const [{ counts: idCounts, results: identities }, priorityCtx] = await Promise.all([
    auditVideoIdentification(videoEntries),
    loadVideoPriorityContext(),
  ]);

  const vdjByPath = new Map(videoEntries.map((e) => [e.filePathNorm, e]));

  let videosWithRvtr = idCounts.directRvtr;
  const byRvtr = new Map<
    string,
    { identity: (typeof identities)[0]; entry: VdjLibraryEntry; playCount: number; priorityScore: number }
  >();

  for (const identity of identities) {
    if (!identity.rvtr) continue;
    const entry = vdjByPath.get(identity.filePathNorm);
    if (!entry) continue;
    const vdj = vdjByPath.get(identity.filePathNorm)!;
    const priority = computeVideoPriorityScore(
      identity,
      { playCount: vdj.playCount, lastPlayed: vdj.lastPlayed },
      priorityCtx,
    );
    const playCount = entry.playCount ?? 0;
    const existing = byRvtr.get(identity.rvtr);
    if (!existing || priority.score > existing.priorityScore) {
      byRvtr.set(identity.rvtr, { identity, entry, playCount, priorityScore: priority.score });
    }
  }

  const uniqueRvtrs = [...byRvtr.keys()];
  const [coverMap, pkgMap] = await Promise.all([
    loadCoverInfoForRvtrs(uniqueRvtrs),
    loadRvtrPackageMap(uniqueRvtrs),
  ]);

  const batch = await loadBatchStatus();
  const failedRvtrs = new Set(batch.jobs.filter((j) => j.status === "failed").map((j) => j.rvtr));

  let videosWithCover = 0;
  let videosWithPackage = 0;
  let videosWithArtifacts = 0;
  let retroverseReady = 0;
  let missingCovers = 0;
  let missingPackages = 0;
  let intelligenceEligible = 0;
  let confidenceSum = 0;
  let confidenceCount = 0;

  const videos: VideoBackfillEntry[] = [];

  for (const [rvtr, { identity, entry, playCount, priorityScore }] of byRvtr) {
    const cover = coverMap.get(rvtr);
    const hasCover = identity.hasCover || Boolean(cover?.coverUrl);
    const pkg = pkgMap.get(rvtr)!;

    if (hasCover) videosWithCover += 1;
    else missingCovers += 1;
    if (pkg.hasPackage) videosWithPackage += 1;
    if (pkg.artifactsReady) videosWithArtifacts += 1;

    const ready = hasCover && pkg.hasPackage && pkg.artifactsReady;
    if (ready) retroverseReady += 1;
    if (hasCover && !pkg.hasPackage) missingPackages += 1;
    if (hasCover) intelligenceEligible += 1;
    if (pkg.hasPackage) {
      confidenceSum += pkg.confidence;
      confidenceCount += 1;
    }

    videos.push({
      rvtr,
      title: entry.title,
      artist: entry.artist,
      playCount,
      filePath: entry.filePath,
      year: entry.year,
      genre: entry.genre,
      hasCover,
      coverUrl: cover?.coverUrl ?? null,
      coverSource: cover?.coverSource ?? null,
      hasPackage: pkg.hasPackage,
      published: pkg.published,
      artifactsReady: pkg.artifactsReady,
      retroverseReady: ready,
      confidence: pkg.confidence,
      status: pkg.status,
      priorityScore,
      identifiable: identity.identifiable,
      researchReady: identity.researchReady,
    });
  }

  videos.sort((a, b) => b.priorityScore - a.priorityScore);

  const videosUnlinked = videoEntries.length - idCounts.totalIdentifiable;
  const batchJobs = await loadBatchStatus();
  const avgRuntime =
    batchJobs.jobs.filter((j) => j.runtimeMs).reduce((n, j) => n + (j.runtimeMs ?? 0), 0) /
    Math.max(1, batchJobs.jobs.filter((j) => j.runtimeMs).length);

  const coverage: VideoBackfillCoverage = {
    scannedAt: universe.scannedAt,
    vdjDatabasePath: vdjDatabasePath(),
    parseMs: universe.parseMs,
    videosInLibrary: videoEntries.length,
    videosWithRvtr,
    videosUnlinked,
    linkedPct: pct(idCounts.totalIdentifiable, videoEntries.length),
    uniqueRvtrs: uniqueRvtrs.length,
    videosWithCover,
    coverPct: pct(videosWithCover, uniqueRvtrs.length),
    videosWithPackage,
    packagePct: pct(videosWithPackage, uniqueRvtrs.length),
    videosWithArtifacts,
    artifactPct: pct(videosWithArtifacts, uniqueRvtrs.length),
    retroverseReady,
    retroverseReadyPct: pct(retroverseReady, uniqueRvtrs.length),
    intelligenceEligible,
    missingLinks: videosUnlinked,
    missingCovers,
    missingPackages,
    failedProcessing: [...failedRvtrs].filter((r) => uniqueRvtrs.includes(r)).length,
    avgConfidence: confidenceCount ? Math.round(confidenceSum / confidenceCount) : 0,
    estimatedMinutesNext10: Math.round(((avgRuntime || 45_000) * 10) / 60_000),
    identification: {
      directRvtr: idCounts.directRvtr,
      pathMatch: idCounts.pathMatch,
      coverMatch: idCounts.coverMatch,
      titleArtistMatch: idCounts.titleArtistMatch,
      totalIdentifiable: idCounts.totalIdentifiable,
      researchReady: idCounts.researchReady,
      packageReady: idCounts.packageReady,
    },
  };

  return { coverage, videos };
}

/** @deprecated use loadVideoBackfillCoverage */
export async function loadBackfillCoverage() {
  const result = await loadVideoBackfillCoverage();
  return { coverage: result.coverage, videos: result.videos, librarySongs: result.videos };
}
