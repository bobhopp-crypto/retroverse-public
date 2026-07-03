import "server-only";

import { inspectQuery } from "@/lib/inspect/pg";
import { coverageOwnedVideoByRvtrSql } from "@/lib/charts/coverage-owned-video-sql";
import { loadCoverInfoForRvtrs } from "@/lib/ops/intelligence/load-rvtr-covers";
import { loadSongPackage } from "@/lib/ops/intelligence/song-package-store";
import { hydratePackageIntel } from "@/lib/ops/intelligence/package-intel";
import { computeArtifactReadiness } from "@/lib/ops/intelligence/artifact-readiness";
import { loadVideoUniverse } from "@/lib/ops/intelligence/video-universe";
import { auditVideoIdentification } from "@/lib/ops/intelligence/video-identification";

export type PackagePriorityRow = {
  rvtr: string;
  artist: string;
  title: string;
  filePath: string;
  playCount: number;
  hasPackage: boolean;
  hasCover: boolean;
  hasChartHistory: boolean;
  hasArtistData: boolean;
  hasPlaybackLink: boolean;
  packageStatus: string | null;
};

export type PackagePriorityAudit = {
  scannedAt: string;
  ownedVideoCount: number;
  withPackage: number;
  withCover: number;
  withChartHistory: number;
  withArtistData: number;
  withPlaybackLink: number;
  fullyReady: number;
  packagePct: number;
  coverPct: number;
  chartPct: number;
  artistPct: number;
  playbackPct: number;
  readyPct: number;
  rows: PackagePriorityRow[];
};

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function hasIntelligencePackage(status: string | null, storyCardCount: number): boolean {
  if (!status) return false;
  if (storyCardCount > 0) return true;
  return status === "published" || status === "cards_ready" || status === "approved";
}

/** Audit owned VIDEO tracks (label RVTR) for package readiness — no writes. */
export async function auditPackagePriority(): Promise<PackagePriorityAudit> {
  const universe = await loadVideoUniverse();
  const { results: identities } = await auditVideoIdentification(universe.videos);

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
  if (rvtrs.length === 0) {
    return {
      scannedAt: new Date().toISOString(),
      ownedVideoCount: 0,
      withPackage: 0,
      withCover: 0,
      withChartHistory: 0,
      withArtistData: 0,
      withPlaybackLink: 0,
      fullyReady: 0,
      packagePct: 0,
      coverPct: 0,
      chartPct: 0,
      artistPct: 0,
      playbackPct: 0,
      readyPct: 0,
      rows: [],
    };
  }

  const [metaRows, coverMap] = await Promise.all([
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
  ]);

  const metaByRvtr = new Map(metaRows.map((row) => [row.rvtr.toUpperCase(), row]));

  let withPackage = 0;
  let withCover = 0;
  let withChartHistory = 0;
  let withArtistData = 0;
  let withPlaybackLink = 0;
  let fullyReady = 0;

  const rows: PackagePriorityRow[] = [];

  for (const base of byRvtr.values()) {
    const rvtr = base.rvtr.toUpperCase();
    const meta = metaByRvtr.get(rvtr);
    const cover = coverMap.get(rvtr);
    const pkg = await loadSongPackage(rvtr);
    const storyCardCount = pkg?.storyCards.filter((c) => c.rank > 0).length ?? 0;
    const hasPackage = hasIntelligencePackage(pkg?.status ?? null, storyCardCount);
    const hydrated = pkg ? hydratePackageIntel(pkg) : null;
    const artifactsReady = hydrated ? computeArtifactReadiness(hydrated).allReady : false;
    const hasCover = Boolean(cover?.coverUrl);
    const hasChartHistory = meta?.has_hot100 === true;
    const hasArtistData = Boolean(meta?.canonical_artist_name?.trim());
    const hasPlaybackLink =
      meta?.has_owned_video === true || meta?.has_youtube === true;

    if (hasPackage) withPackage += 1;
    if (hasCover) withCover += 1;
    if (hasChartHistory) withChartHistory += 1;
    if (hasArtistData) withArtistData += 1;
    if (hasPlaybackLink) withPlaybackLink += 1;
    if (hasPackage && hasCover && hasChartHistory && hasArtistData && hasPlaybackLink && artifactsReady) {
      fullyReady += 1;
    }

    rows.push({
      rvtr,
      artist: base.artist,
      title: base.title,
      filePath: base.filePath,
      playCount: base.playCount,
      hasPackage,
      hasCover,
      hasChartHistory,
      hasArtistData,
      hasPlaybackLink,
      packageStatus: pkg?.status ?? null,
    });
  }

  rows.sort((a, b) => b.playCount - a.playCount);

  const total = rows.length;
  return {
    scannedAt: new Date().toISOString(),
    ownedVideoCount: total,
    withPackage,
    withCover,
    withChartHistory,
    withArtistData,
    withPlaybackLink,
    fullyReady,
    packagePct: pct(withPackage, total),
    coverPct: pct(withCover, total),
    chartPct: pct(withChartHistory, total),
    artistPct: pct(withArtistData, total),
    playbackPct: pct(withPlaybackLink, total),
    readyPct: pct(fullyReady, total),
    rows,
  };
}
