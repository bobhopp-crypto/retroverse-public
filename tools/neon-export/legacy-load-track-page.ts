import { cache } from "react";

import { inspectQuery } from "@/lib/inspect/pg";
import {
  resolveCanonicalTrack,
  type PublicLoaderTiming,
} from "@/lib/public/canonical-public-resolver";
import type {
  PrimaryAlbumConfidence,
  PrimaryAlbumPolicyReason,
  RankedPrimaryAlbum,
} from "@/lib/public/primary-album-policy";
import { rvChronologyHrefFromChartDate } from "@/lib/rv/rv-chronology-paths";
import { trackPageHref } from "@/lib/search/entity-routes";
import { chartsToTrajectoryWeeks } from "@/lib/track/charts-to-trajectory-weeks";
import { formatCanonicalTitle } from "@/lib/track/format-canonical-title";
import type { TrackTrajectoryWeek } from "@/lib/track/track-trajectory-types";

export type TrackAlbumLink = {
  albumId: number;
  title: string;
  releaseYear: number | null;
  rval: string | null;
  coverUrl: string | null;
  href: string | null;
  policyReason: PrimaryAlbumPolicyReason;
  reason: string;
  confidence: PrimaryAlbumConfidence;
};

export type TrackRelatedSong = {
  rvtr: string;
  title: string;
  releaseYear: number | null;
  peakHot100: number | null;
  href: string;
  coverUrl: string | null;
};

export type TrackPageData = {
  rvtr: string;
  canonicalTrackId: number;
  title: string;
  artistId: number;
  artistName: string;
  /** Canonical public route token; retained under the old field name for view compatibility. */
  artistSlug: string;
  artistHref: string;
  releaseYear: number | null;
  peakHot100: number | null;
  chartWeeks: number;
  firstChartDate: string | null;
  coverUrl: string | null;
  hasHot100: boolean;
  hasVdjMedia: boolean;
  primaryAlbum: TrackAlbumLink | null;
  secondaryAlbums: TrackAlbumLink[];
  primaryAlbumReason: string;
  primaryAlbumConfidence: PrimaryAlbumConfidence;
  albums: TrackAlbumLink[];
  trajectoryWeeks: TrackTrajectoryWeek[];
  chartRunLabel: string;
  relatedTracks: TrackRelatedSong[];
  rvYearHref: string | null;
  resolverPath: string[];
  loaderTimings: PublicLoaderTiming[];
};

function yearFromDate(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const year = Number(value.slice(0, 4));
  return Number.isFinite(year) && year > 0 ? year : null;
}

function albumLink(album: RankedPrimaryAlbum): TrackAlbumLink {
  return {
    albumId: album.albumId,
    title: album.title,
    releaseYear: album.releaseYear,
    rval: album.rval,
    coverUrl: album.coverUrl,
    href: album.rval ? `/album/${album.rval}` : null,
    policyReason: album.policyReason,
    reason: album.reason,
    confidence: album.confidence,
  };
}

async function loadTrackPageImpl(rvtrParam: string): Promise<TrackPageData | null> {
  const canonical = await resolveCanonicalTrack(rvtrParam);
  if (!canonical) return null;

  const rvtr = canonical.rvtr;
  const startedAt = performance.now();
  const relatedRows = await inspectQuery<{
      track_id: string;
      canonical_title: string;
      peak_hot100_position: number | null;
      first_chart_date: string | null;
    }>(
    `
    SELECT track_id, canonical_title, peak_hot100_position,
           first_chart_date::text AS first_chart_date
    FROM canonical_track_display
    WHERE artist_id = $1
      AND upper(trim(track_id)) <> $2
    ORDER BY first_chart_date ASC NULLS LAST, canonical_title ASC
    LIMIT 4
    `,
    [canonical.artist.artistId, rvtr],
  );
  const relatedDuration = Math.round((performance.now() - startedAt) * 100) / 100;

  const primaryAlbum = canonical.albumResolution.primaryAlbum
    ? albumLink(canonical.albumResolution.primaryAlbum)
    : null;
  const secondaryAlbums = canonical.albumResolution.secondaryAlbums.map(albumLink);
  const albums = primaryAlbum ? [primaryAlbum, ...secondaryAlbums] : secondaryAlbums;
  const coverUrl = canonical.albumResolution.artworkAlbum?.coverUrl ?? null;

  const hot100Rows = canonical.chartRelationships.filter((row) => /hot\s*100/i.test(row.chartName));
  const chartRunRows = hot100Rows.length > 0 ? hot100Rows : canonical.chartRelationships;
  const chartRunLabel = chartRunRows[0]?.chartName.replace(/^Billboard\s+/i, "") ?? "Hot 100";
  const trajectoryWeeks = chartsToTrajectoryWeeks(
    chartRunRows.map((row) => ({
      chart_date: row.chartDate,
      chart_position: row.chartPosition,
      weeks_on_chart: row.weeksOnChart,
    })),
  );

  const relatedTracks: TrackRelatedSong[] = relatedRows.map((row) => ({
    rvtr: row.track_id.trim().toUpperCase(),
    title: formatCanonicalTitle(row.canonical_title),
    releaseYear: yearFromDate(row.first_chart_date),
    peakHot100: row.peak_hot100_position,
    href: trackPageHref(row.track_id),
    coverUrl: null,
  }));

  const releaseYear =
    canonical.canonicalYear ??
    yearFromDate(trajectoryWeeks[0]?.issueDate ?? canonical.firstChartDate) ??
    primaryAlbum?.releaseYear ??
    null;
  const peakWeekDate =
    (canonical.peakHot100Position != null
      ? trajectoryWeeks.find((week) => week.rank === canonical.peakHot100Position)?.issueDate
      : null) ??
    trajectoryWeeks[trajectoryWeeks.length - 1]?.issueDate ??
    canonical.firstChartDate;
  const canonicalYearChartDate =
    releaseYear != null && yearFromDate(peakWeekDate) === releaseYear
      ? peakWeekDate
      : releaseYear != null && yearFromDate(canonical.firstChartDate) === releaseYear
        ? canonical.firstChartDate
        : null;

  return {
    rvtr,
    canonicalTrackId: canonical.canonicalTrackId,
    title: formatCanonicalTitle(canonical.title),
    artistId: canonical.artist.artistId,
    artistName: canonical.artist.displayName,
    artistSlug: canonical.artist.routeToken,
    artistHref: canonical.artist.href,
    releaseYear,
    peakHot100: canonical.peakHot100Position,
    chartWeeks: canonical.chartWeeks,
    firstChartDate: canonical.firstChartDate,
    coverUrl,
    hasHot100: canonical.hasHot100,
    hasVdjMedia: canonical.hasVdjMedia,
    primaryAlbum,
    secondaryAlbums,
    primaryAlbumReason: canonical.albumResolution.reason,
    primaryAlbumConfidence: canonical.albumResolution.confidence,
    albums,
    trajectoryWeeks,
    chartRunLabel,
    relatedTracks,
    rvYearHref: rvChronologyHrefFromChartDate(canonicalYearChartDate, releaseYear),
    resolverPath: canonical.resolverPath,
    loaderTimings: [
      ...canonical.loaderTimings,
      { name: "track-related", durationMs: relatedDuration },
    ],
  };
}

/** Dedupes metadata, page, homepage, and public package work within one request. */
export const loadTrackPage = cache(loadTrackPageImpl);
