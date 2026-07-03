import "server-only";

import { inspectQuery } from "@/lib/inspect/pg";
import { coverageOwnedVideoByRvtrSql } from "@/lib/charts/coverage-owned-video-sql";
import { loadCoverInfoForRvtrs } from "@/lib/ops/intelligence/load-rvtr-covers";
import { loadBatchStatus } from "@/lib/ops/intelligence/batch-status";
import { computeArtifactReadiness } from "@/lib/ops/intelligence/artifact-readiness";
import { hydratePackageIntel } from "@/lib/ops/intelligence/package-intel";
import { loadSongPackage, loadSongPackageIndex } from "@/lib/ops/intelligence/song-package-store";
import type { SongPackageStatus } from "@/lib/ops/intelligence/song-package-types";
import { auditVideoIdentification } from "@/lib/ops/intelligence/video-identification";
import { loadVideoUniverse } from "@/lib/ops/intelligence/video-universe";

export type PipelineTrackRow = {
  rvtr: string;
  artist: string;
  title: string;
  filePath: string;
  playCount: number;
  hasCover: boolean;
  hasChartHistory: boolean;
  hasArtistData: boolean;
  hasPlaybackLink: boolean;
  hasPackageFile: boolean;
  hasIntelligencePackage: boolean;
  packageStatus: SongPackageStatus | null;
  storyCardCount: number;
  artifactsReady: boolean;
  artifactGaps: string[];
  batchStatus: string | null;
  batchError: string | null;
  primaryBlocker: PipelineBlocker;
  fullyReady: boolean;
};

export type PipelineBlocker =
  | "fully_ready"
  | "artifacts_incomplete"
  | "package_never_generated"
  | "package_draft_or_processing"
  | "package_generation_failed"
  | "missing_cover"
  | "missing_playback_link"
  | "missing_chart_history"
  | "missing_artist_data";

export type PipelineCategoryCount = {
  key: PipelineBlocker;
  label: string;
  count: number;
  pct: number;
};

export type PackagePipelineAudit = {
  scannedAt: string;
  ownedVideoCount: number;
  fullyReady: number;
  fullyReadyPct: number;
  withIntelligencePackage: number;
  withPackageFile: number;
  packageStatusCounts: Record<string, number>;
  prerequisiteCounts: {
    hasCover: number;
    hasChartHistory: number;
    hasArtistData: number;
    hasPlaybackLink: number;
    hasAllPrerequisites: number;
  };
  /** Primary blocker — one category per track (waterfall). */
  primaryBlockers: PipelineCategoryCount[];
  /** Among tracks WITH a package file but NOT fully ready. */
  packageIncompleteReasons: PipelineCategoryCount[];
  /** Among tracks WITHOUT intelligence package. */
  noPackageReasons: PipelineCategoryCount[];
  /** Tracks that need only artifact completion (package+cover+chart+playback present). */
  artifactOnlyGap: number;
  /** Tracks ready for first package generation (cover+playback, no package file). */
  packageGenerationReady: number;
  /** Tracks with package+cover+chart+playback — potential fully-ready after artifacts. */
  packageCompleteInputs: number;
  /** Projection: fully-ready if all packageCompleteInputs got artifacts. */
  projectedFullyReadyIfArtifacts: number;
  rows: PipelineTrackRow[];
};

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 1000) / 10 : 0;
}

function hasIntelligencePackage(
  status: SongPackageStatus | null,
  storyCardCount: number,
): boolean {
  if (!status) return false;
  if (storyCardCount > 0) return true;
  return status === "published" || status === "cards_ready" || status === "approved";
}

function artifactGaps(pkg: Awaited<ReturnType<typeof loadSongPackage>>): string[] {
  if (!pkg) return [];
  const readiness = computeArtifactReadiness(hydratePackageIntel(pkg));
  const gaps: string[] = [];
  if (!readiness.record_label) gaps.push("record_label");
  if (!readiness.timeline) gaps.push("timeline");
  if (!readiness.story_constellation) gaps.push("story_constellation");
  if (!readiness.song_dna) gaps.push("song_dna");
  return gaps;
}

function classifyPrimaryBlocker(input: {
  hasCover: boolean;
  hasChartHistory: boolean;
  hasArtistData: boolean;
  hasPlaybackLink: boolean;
  hasPackageFile: boolean;
  hasIntelligencePackage: boolean;
  artifactsReady: boolean;
  batchStatus: string | null;
  packageStatus: SongPackageStatus | null;
}): PipelineBlocker {
  if (
    input.hasIntelligencePackage &&
    input.hasCover &&
    input.hasChartHistory &&
    input.hasArtistData &&
    input.hasPlaybackLink &&
    input.artifactsReady
  ) {
    return "fully_ready";
  }

  if (input.hasIntelligencePackage) {
    if (!input.artifactsReady) return "artifacts_incomplete";
    if (!input.hasCover) return "missing_cover";
    if (!input.hasPlaybackLink) return "missing_playback_link";
    if (!input.hasChartHistory) return "missing_chart_history";
    if (!input.hasArtistData) return "missing_artist_data";
    return "artifacts_incomplete";
  }

  if (input.batchStatus === "failed") return "package_generation_failed";

  if (input.hasPackageFile) {
    return "package_draft_or_processing";
  }

  if (!input.hasCover) return "missing_cover";
  if (!input.hasPlaybackLink) return "missing_playback_link";
  if (!input.hasChartHistory) return "missing_chart_history";
  if (!input.hasArtistData) return "missing_artist_data";

  return "package_never_generated";
}

const BLOCKER_LABELS: Record<PipelineBlocker, string> = {
  fully_ready: "Fully ready",
  artifacts_incomplete: "Package exists — artifacts incomplete",
  package_never_generated: "Prerequisites met — package never generated",
  package_draft_or_processing: "Package file exists — draft/processing/review",
  package_generation_failed: "Package generation failed (batch)",
  missing_cover: "Missing cover",
  missing_playback_link: "Missing playback link (no VIDEO link + no YouTube)",
  missing_chart_history: "Missing Hot 100 chart history",
  missing_artist_data: "Missing artist graph data",
};

function countCategories(
  total: number,
  counts: Map<PipelineBlocker, number>,
): PipelineCategoryCount[] {
  return [...counts.entries()]
    .map(([key, count]) => ({
      key,
      label: BLOCKER_LABELS[key],
      count,
      pct: pct(count, total),
    }))
    .sort((a, b) => b.count - a.count);
}

/** Deep audit — primary blockers + package pipeline failure categories. */
export async function auditPackagePipeline(): Promise<PackagePipelineAudit> {
  const universe = await loadVideoUniverse();
  const { results: identities } = await auditVideoIdentification(universe.videos);
  const batch = await loadBatchStatus();
  const batchByRvtr = new Map(batch.jobs.map((j) => [j.rvtr.toUpperCase(), j]));

  const byRvtr = new Map<
    string,
    { rvtr: string; artist: string; title: string; filePath: string; playCount: number }
  >();

  for (const identity of identities) {
    if (!identity.rvtr) continue;
    const entry = universe.videos.find((v) => v.filePathNorm === identity.filePathNorm);
    if (!entry) continue;
    const existing = byRvtr.get(identity.rvtr);
    const playCount = entry.playCount ?? 0;
    if (!existing || playCount > existing.playCount) {
      byRvtr.set(identity.rvtr, {
        rvtr: identity.rvtr,
        artist: entry.artist,
        title: entry.title,
        filePath: entry.filePath,
        playCount,
      });
    }
  }

  const rvtrs = [...byRvtr.keys()];
  const empty: PackagePipelineAudit = {
    scannedAt: new Date().toISOString(),
    ownedVideoCount: 0,
    fullyReady: 0,
    fullyReadyPct: 0,
    withIntelligencePackage: 0,
    withPackageFile: 0,
    packageStatusCounts: {},
    prerequisiteCounts: {
      hasCover: 0,
      hasChartHistory: 0,
      hasArtistData: 0,
      hasPlaybackLink: 0,
      hasAllPrerequisites: 0,
    },
    primaryBlockers: [],
    packageIncompleteReasons: [],
    noPackageReasons: [],
    artifactOnlyGap: 0,
    packageGenerationReady: 0,
    packageCompleteInputs: 0,
    projectedFullyReadyIfArtifacts: 0,
    rows: [],
  };

  if (rvtrs.length === 0) return empty;

  const [metaRows, coverMap, packageIndex] = await Promise.all([
    inspectQuery<{
      rvtr: string;
      has_hot100: boolean;
      canonical_artist_name: string;
      has_youtube: boolean;
      has_owned_video: boolean;
    }>(
      `
      WITH rvtr_list AS (
        SELECT upper(trim(x)) AS rvtr FROM unnest($1::text[]) AS x
      )
      SELECT
        r.rvtr,
        coalesce(ctd.has_hot100, false) AS has_hot100,
        coalesce(nullif(trim(ctd.canonical_artist_name), ''), '') AS canonical_artist_name,
        EXISTS (
          SELECT 1 FROM youtube_video_tracks yvt
          WHERE upper(trim(yvt.rvtr)) = r.rvtr
            AND yvt.review_flag IN ('approved', 'pending')
            AND yvt.confidence IN ('exact', 'high')
        ) AS has_youtube,
        ${coverageOwnedVideoByRvtrSql("r.rvtr")} AS has_owned_video
      FROM rvtr_list r
      LEFT JOIN canonical_track_display ctd
        ON upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) = r.rvtr
      `,
      [rvtrs],
    ),
    loadCoverInfoForRvtrs(rvtrs),
    loadSongPackageIndex(),
  ]);

  const indexByRvtr = new Map(
    packageIndex.packages.map((p) => [p.rvtr.toUpperCase(), p]),
  );

  const metaByRvtr = new Map(metaRows.map((row) => [row.rvtr.toUpperCase(), row]));

  const primaryCounts = new Map<PipelineBlocker, number>();
  const noPackageCounts = new Map<PipelineBlocker, number>();
  const packageIncompleteCounts = new Map<PipelineBlocker, number>();
  const packageStatusCounts: Record<string, number> = { none: 0 };

  let fullyReady = 0;
  let withIntelligencePackage = 0;
  let withPackageFile = 0;
  let artifactOnlyGap = 0;
  let packageGenerationReady = 0;
  let packageCompleteInputs = 0;

  const prereq = {
    hasCover: 0,
    hasChartHistory: 0,
    hasArtistData: 0,
    hasPlaybackLink: 0,
    hasAllPrerequisites: 0,
  };

  const rows: PipelineTrackRow[] = [];

  for (const base of byRvtr.values()) {
    const rvtr = base.rvtr.toUpperCase();
    const meta = metaByRvtr.get(rvtr);
    const cover = coverMap.get(rvtr);
    const indexEntry = indexByRvtr.get(rvtr);
    const batchJob = batchByRvtr.get(rvtr);

    let pkg: Awaited<ReturnType<typeof loadSongPackage>> = null;
    let storyCardCount = 0;
    if (indexEntry) {
      pkg = await loadSongPackage(rvtr);
      storyCardCount = pkg?.storyCards.filter((c) => c.rank > 0).length ?? 0;
    }

    const hasPackageFile = indexEntry != null || pkg != null;
    const packageStatus = pkg?.status ?? indexEntry?.status ?? null;
    const hasIntelPkg = hasIntelligencePackage(packageStatus, storyCardCount);
    const gaps = artifactGaps(pkg);
    const artifactsReady = gaps.length === 0 && hasPackageFile;
    const hasCover = Boolean(cover?.coverUrl);
    const hasChartHistory = meta?.has_hot100 === true;
    const hasArtistData = Boolean(meta?.canonical_artist_name?.trim());
    const hasPlaybackLink =
      meta?.has_owned_video === true || meta?.has_youtube === true;

    if (hasCover) prereq.hasCover += 1;
    if (hasChartHistory) prereq.hasChartHistory += 1;
    if (hasArtistData) prereq.hasArtistData += 1;
    if (hasPlaybackLink) prereq.hasPlaybackLink += 1;
    if (hasCover && hasChartHistory && hasArtistData && hasPlaybackLink) {
      prereq.hasAllPrerequisites += 1;
    }

    if (hasPackageFile) {
      withPackageFile += 1;
      const status = packageStatus ?? "unknown";
      packageStatusCounts[status] = (packageStatusCounts[status] ?? 0) + 1;
    } else {
      packageStatusCounts.none = (packageStatusCounts.none ?? 0) + 1;
    }

    if (hasIntelPkg) withIntelligencePackage += 1;

    const primaryBlocker = classifyPrimaryBlocker({
      hasCover,
      hasChartHistory,
      hasArtistData,
      hasPlaybackLink,
      hasPackageFile,
      hasIntelligencePackage: hasIntelPkg,
      artifactsReady,
      batchStatus: batchJob?.status ?? null,
      packageStatus: packageStatus,
    });

    const isFullyReady = primaryBlocker === "fully_ready";
    if (isFullyReady) fullyReady += 1;

    primaryCounts.set(primaryBlocker, (primaryCounts.get(primaryBlocker) ?? 0) + 1);

    if (!hasIntelPkg) {
      const noPkgBlocker =
        batchJob?.status === "failed"
          ? "package_generation_failed"
          : hasPackageFile
            ? "package_draft_or_processing"
            : !hasCover
              ? "missing_cover"
              : !hasPlaybackLink
                ? "missing_playback_link"
                : !hasChartHistory
                  ? "missing_chart_history"
                  : !hasArtistData
                    ? "missing_artist_data"
                    : "package_never_generated";
      noPackageCounts.set(noPkgBlocker, (noPackageCounts.get(noPkgBlocker) ?? 0) + 1);
    } else if (!isFullyReady) {
      const reason = !artifactsReady
        ? "artifacts_incomplete"
        : !hasCover
          ? "missing_cover"
          : !hasPlaybackLink
            ? "missing_playback_link"
            : !hasChartHistory
              ? "missing_chart_history"
              : "missing_artist_data";
      packageIncompleteCounts.set(reason, (packageIncompleteCounts.get(reason) ?? 0) + 1);
    }

    if (
      hasIntelPkg &&
      hasCover &&
      hasChartHistory &&
      hasArtistData &&
      hasPlaybackLink &&
      !artifactsReady
    ) {
      artifactOnlyGap += 1;
    }

    if (!hasPackageFile && hasCover && hasPlaybackLink && batchJob?.status !== "failed") {
      packageGenerationReady += 1;
    }

    if (hasIntelPkg && hasCover && hasChartHistory && hasArtistData && hasPlaybackLink) {
      packageCompleteInputs += 1;
    }

    rows.push({
      rvtr,
      artist: base.artist,
      title: base.title,
      filePath: base.filePath,
      playCount: base.playCount,
      hasCover,
      hasChartHistory,
      hasArtistData,
      hasPlaybackLink,
      hasPackageFile,
      hasIntelligencePackage: hasIntelPkg,
      packageStatus: packageStatus,
      storyCardCount,
      artifactsReady,
      artifactGaps: gaps,
      batchStatus: batchJob?.status ?? null,
      batchError: batchJob?.error ?? null,
      primaryBlocker,
      fullyReady: isFullyReady,
    });
  }

  rows.sort((a, b) => b.playCount - a.playCount);
  const total = rows.length;

  return {
    scannedAt: new Date().toISOString(),
    ownedVideoCount: total,
    fullyReady,
    fullyReadyPct: pct(fullyReady, total),
    withIntelligencePackage,
    withPackageFile,
    packageStatusCounts,
    prerequisiteCounts: prereq,
    primaryBlockers: countCategories(total, primaryCounts),
    packageIncompleteReasons: countCategories(
      withIntelligencePackage - fullyReady,
      packageIncompleteCounts,
    ),
    noPackageReasons: countCategories(total - withIntelligencePackage, noPackageCounts),
    artifactOnlyGap,
    packageGenerationReady,
    packageCompleteInputs,
    projectedFullyReadyIfArtifacts: fullyReady + artifactOnlyGap,
    rows,
  };
}
