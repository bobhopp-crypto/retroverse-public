import { loadBatchStatus, type BatchSongStatus } from "./batch-status";
import { computeArtifactReadiness, packageConfidence } from "./artifact-readiness";
import { loadCoverInfoForRvtrs } from "./load-rvtr-covers";
import { loadAutoRecoveredCovers } from "./cover-recovery-store";
import { hydratePackageIntel } from "./package-intel";
import { loadSongPackage } from "./song-package-store";
import { auditVideoIdentification } from "./video-identification";
import { loadVideoUniverse } from "./video-universe";
import type { VdjLibraryEntry } from "./vdj-database";

export type TopPlayedTrack = {
  rvtr: string | null;
  title: string;
  artist: string;
  playCount: number;
  filePath: string;
  identifiable: boolean;
  hasCover: boolean;
  coverSource: string | null;
  hasPackage: boolean;
  artifactsReady: boolean;
  retroverseReady: boolean;
  confidence: number;
  runtimeMs: number | null;
  status: string | null;
};

export type TopPlayedCohortStats = {
  size: number;
  cover: number;
  coverPct: number;
  package: number;
  packagePct: number;
  artifacts: number;
  artifactPct: number;
  retroverseReady: number;
  readyPct: number;
  avgConfidence: number;
  avgRuntimeMs: number | null;
  missingCovers: number;
  missingPackages: number;
  missingArtifacts: number;
};

export type TopPlayedBackfillData = {
  scannedAt: string;
  tracks: TopPlayedTrack[];
  top25: TopPlayedCohortStats;
  top50: TopPlayedCohortStats;
  top100: TopPlayedCohortStats;
  coverCompletionQueue: TopPlayedTrack[];
  avgRuntimeMs: number;
  projectedTop100Minutes: number;
  workRemaining: {
    covers: number;
    packages: number;
    artifacts: number;
    totalPipelineRuns: number;
  };
};

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function hasIntelligencePackage(status: string | null, storyCardCount: number): boolean {
  if (!status) return false;
  if (storyCardCount > 0) return true;
  return status === "published" || status === "cards_ready" || status === "approved" || status === "review";
}

function cohortStats(tracks: TopPlayedTrack[], size: number): TopPlayedCohortStats {
  const slice = tracks.slice(0, size);
  const withPkg = slice.filter((t) => t.hasPackage);
  const runtimes = slice.map((t) => t.runtimeMs).filter((ms): ms is number => ms != null && ms > 0);
  const confidences = withPkg.map((t) => t.confidence);
  const ready = slice.filter((t) => t.retroverseReady).length;
  const cover = slice.filter((t) => t.hasCover).length;
  const pkg = slice.filter((t) => t.hasPackage).length;
  const artifacts = slice.filter((t) => t.artifactsReady).length;

  return {
    size: slice.length,
    cover,
    coverPct: pct(cover, slice.length),
    package: pkg,
    packagePct: pct(pkg, slice.length),
    artifacts,
    artifactPct: pct(artifacts, slice.length),
    retroverseReady: ready,
    readyPct: pct(ready, slice.length),
    avgConfidence: confidences.length
      ? Math.round(confidences.reduce((n, c) => n + c, 0) / confidences.length)
      : 0,
    avgRuntimeMs: runtimes.length
      ? Math.round(runtimes.reduce((n, ms) => n + ms, 0) / runtimes.length)
      : null,
    missingCovers: slice.filter((t) => !t.hasCover).length,
    missingPackages: slice.filter((t) => t.hasCover && !t.hasPackage).length,
    missingArtifacts: slice.filter((t) => t.hasPackage && !t.artifactsReady).length,
  };
}

function runtimeForRvtr(batchJobs: BatchSongStatus[], rvtr: string | null): number | null {
  if (!rvtr) return null;
  const job = batchJobs.find((j) => j.rvtr === rvtr && j.runtimeMs);
  return job?.runtimeMs ?? null;
}

/** VIDEO · identifiable · play count DESC — Top Played backfill universe. */
export async function loadTopPlayedBackfill(): Promise<TopPlayedBackfillData> {
  const universe = await loadVideoUniverse();
  const [{ results: identities }, batch] = await Promise.all([
    auditVideoIdentification(universe.videos),
    loadBatchStatus(),
  ]);

  const vdjByPath = new Map(universe.videos.map((e) => [e.filePathNorm, e]));

  const identifiable = identities
    .filter((i) => i.identifiable)
    .sort((a, b) => b.playCount - a.playCount);

  const byKey = new Map<string, { identity: (typeof identifiable)[0]; entry: VdjLibraryEntry }>();
  for (const identity of identifiable) {
    const entry = vdjByPath.get(identity.filePathNorm);
    if (!entry) continue;
    const key = identity.rvtr ?? identity.filePathNorm;
    const existing = byKey.get(key);
    if (!existing || (entry.playCount ?? 0) > (existing.entry.playCount ?? 0)) {
      byKey.set(key, { identity, entry });
    }
  }

  const deduped = [...byKey.values()].sort(
    (a, b) => (b.entry.playCount ?? 0) - (a.entry.playCount ?? 0),
  );

  const rvtrs = [...new Set(deduped.map((d) => d.identity.rvtr).filter(Boolean))] as string[];
  const [coverMap, recoveredCovers] = await Promise.all([
    loadCoverInfoForRvtrs(rvtrs),
    loadAutoRecoveredCovers(),
  ]);

  const tracks: TopPlayedTrack[] = [];

  for (const { identity, entry } of deduped) {
    const rvtr = identity.rvtr;
    const cover = rvtr ? coverMap.get(rvtr) : undefined;
    const recovered = rvtr ? recoveredCovers.get(rvtr) : undefined;
    const hasCover =
      identity.hasCover ||
      Boolean(cover?.coverUrl) ||
      Boolean(recovered?.coverUrl);

    let hasPackage = false;
    let artifactsReady = false;
    let confidence = 0;
    let status: string | null = null;

    if (rvtr) {
      const pkg = await loadSongPackage(rvtr);
      if (pkg) {
        const hydrated = hydratePackageIntel(pkg);
        const artifacts = computeArtifactReadiness(hydrated);
        const storyCardCount = pkg.storyCards.filter((c) => c.rank > 0).length;
        hasPackage = hasIntelligencePackage(pkg.status, storyCardCount);
        artifactsReady = artifacts.allReady;
        confidence = packageConfidence(hydrated);
        status = pkg.status;
      }
    }

    tracks.push({
      rvtr,
      title: entry.title,
      artist: entry.artist,
      playCount: entry.playCount ?? 0,
      filePath: entry.filePath,
      identifiable: true,
      hasCover,
      coverSource: recovered?.coverSource ?? cover?.coverSource ?? null,
      hasPackage,
      artifactsReady,
      retroverseReady: hasCover && hasPackage && artifactsReady,
      confidence,
      runtimeMs: runtimeForRvtr(batch.jobs, rvtr),
      status,
    });
  }

  const runtimes = batch.jobs.filter((j) => j.runtimeMs).map((j) => j.runtimeMs!);
  const avgRuntimeMs =
    runtimes.length > 0
      ? Math.round(runtimes.reduce((n, ms) => n + ms, 0) / runtimes.length)
      : 45_000;

  const top100 = tracks.slice(0, 100);
  const needsPipeline = top100.filter((t) => t.rvtr && (!t.hasPackage || !t.artifactsReady) && t.hasCover);
  const needsCover = top100.filter((t) => !t.hasCover);

  return {
    scannedAt: universe.scannedAt,
    tracks,
    top25: cohortStats(tracks, 25),
    top50: cohortStats(tracks, 50),
    top100: cohortStats(tracks, 100),
    coverCompletionQueue: top100.filter((t) => !t.hasCover),
    avgRuntimeMs,
    projectedTop100Minutes: Math.round(
      ((needsPipeline.length + needsCover.length) * avgRuntimeMs) / 60_000,
    ),
    workRemaining: {
      covers: needsCover.length,
      packages: top100.filter((t) => t.hasCover && !t.hasPackage).length,
      artifacts: top100.filter((t) => t.hasPackage && !t.artifactsReady).length,
      totalPipelineRuns: needsPipeline.length,
    },
  };
}

/** RVTRs for top-N package processing — play count DESC, cover required. */
export function topPlayedPackageQueueRvtrs(
  data: TopPlayedBackfillData,
  limit: number,
  skip: Set<string> = new Set(),
): string[] {
  const out: string[] = [];
  for (const track of data.tracks) {
    if (out.length >= limit) break;
    if (!track.rvtr || skip.has(track.rvtr)) continue;
    if (!track.hasCover) continue;
    if (track.retroverseReady) continue;
    out.push(track.rvtr);
  }
  return out;
}

export const MIN_PIPELINE_COVER_CONFIDENCE = 78;

/** Top-N VIDEO cohort eligible for intelligence pipeline (RVTR + cover + confidence gates). */
export async function loadTopPipelineEligible(limit: number): Promise<TopPlayedTrack[]> {
  const data = await loadTopPlayedBackfill();
  const { loadCoverRecoveryQueue } = await import("./cover-recovery-store");
  const recovery = await loadCoverRecoveryQueue();
  const recoveryByRvtr = new Map(
    recovery.entries.map((e) => [e.rvtr.toUpperCase(), e]),
  );

  return data.tracks.slice(0, limit).filter((t) => {
    if (!t.identifiable || !t.rvtr || !t.hasCover) return false;
    const rec = recoveryByRvtr.get(t.rvtr.toUpperCase());
    if (rec?.outcome === "review_needed") return false;
    if (rec?.outcome === "recovered" && rec.confidence < MIN_PIPELINE_COVER_CONFIDENCE) {
      return false;
    }
    if (
      rec?.outcome === "failed" &&
      !t.coverSource?.toLowerCase().includes("retroverse") &&
      !t.coverSource?.toLowerCase().includes("album")
    ) {
      return false;
    }
    return true;
  });
}

/** Top 100 cohort eligible for intelligence pipeline. */
export async function loadTop100PipelineEligible(): Promise<TopPlayedTrack[]> {
  return loadTopPipelineEligible(100);
}

/** Top 500 VIDEO cohort for overnight intelligence build. */
export async function loadTop500PipelineEligible(): Promise<TopPlayedTrack[]> {
  return loadTopPipelineEligible(500);
}
