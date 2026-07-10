import { resolveAlbumCoverUrlFromRow } from "@/lib/artwork/resolve-album-cover-url";
import { displayArtistName, slugFromArtistName } from "@/lib/artist/slug";
import { loadTrackCoverageByRvtr } from "@/lib/charts/load-track-coverage-batch";
import type { TrackCoverageStatus } from "@/lib/charts/track-coverage";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { albumSuggestionHref, trackPageHref } from "@/lib/search/entity-routes";
import { chartsToTrajectoryWeeks } from "@/lib/track/charts-to-trajectory-weeks";
import { rvChronologyHrefFromChartDate, rvYearHref } from "@/lib/rv/rv-chronology-paths";
import type { TrackTrajectoryWeek } from "@/lib/track/track-trajectory-types";

import { buildAlbumChartFeatures, albumTitleKey } from "./album-chart-features";
import { rankSimilarAlbumChartJourneys, type SimilarAlbumMatch } from "./album-chart-similarity";
import { buildAlbumDescription } from "./build-album-description";
import { loadAlbumChartFeaturesIndex } from "./load-album-chart-index";
import { loadAlbumSourceHints } from "./load-album-source-data";

const RE_RVAL = /^RVAL\d{6}$/i;
const RE_RVTR = /^RVTR\d{6}$/i;

export type AlbumTrackRow = {
  position: number;
  title: string;
  rvtr: string | null;
  href: string | null;
  coverageStatus: TrackCoverageStatus;
  coverUrl: string | null;
};

export type AlbumInfoSection = {
  releaseDate: string | null;
  label: string | null;
  genres: string[];
  certifications: string[];
  awards: string[];
  majorSingles: string[];
  artistHref: string;
  yearHref: string | null;
  relatedExperiences: Array<{ label: string; href: string }>;
};

export type AlbumPageData = {
  rval: string;
  title: string;
  artistName: string;
  artistSlug: string;
  artistHref: string;
  releaseYear: number | null;
  coverUrl: string | null;
  b200Peak: number | null;
  chartWeeks: number;
  weeksAtPeak: number;
  weeksAtNumberOne: number;
  firstChartDate: string | null;
  lastChartDate: string | null;
  trajectoryWeeks: TrackTrajectoryWeek[];
  chartRunLabel: string;
  description: string;
  journeySummary: string | null;
  tracks: AlbumTrackRow[];
  similarChartJourneys: SimilarAlbumMatch[];
  info: AlbumInfoSection;
  rvYearHref: string | null;
};

function pickCoverUrl(...candidates: (string | null | undefined)[]): string | null {
  return resolveAlbumCoverUrlFromRow({
    artwork_path: candidates[1],
    cover_path: candidates[0],
    r2_cover_key: candidates[2],
  });
}

function yearFromDate(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const y = Number(value.slice(0, 4));
  return Number.isFinite(y) && y > 0 ? y : null;
}

function weeksAtPeakRank(weeks: TrackTrajectoryWeek[], peak: number | null): number {
  if (peak == null) return 0;
  return weeks.filter((week) => week.rank === peak).length;
}

type AlbumHeaderRow = {
  pg_album_id: number;
  artist_id: number;
  title: string;
  release_year: number | null;
  artist_name: string;
  cover_path: string | null;
  artwork_path: string | null;
  r2_cover_key: string | null;
};

export async function loadAlbumPage(rvalParam: string): Promise<AlbumPageData | null> {
  const ping = await inspectPing();
  if (!ping.ok) return null;

  const rval = rvalParam.trim().toUpperCase();
  if (!RE_RVAL.test(rval)) return null;

  const headerRows = await inspectQuery<AlbumHeaderRow>(
    `
    SELECT
      al.id AS pg_album_id,
      al.artist_id,
      al.title,
      al.release_year,
      ar.canonical_name AS artist_name,
      al.canonical_cover_path AS cover_path,
      (
        SELECT aal.canonical_cover_path FROM album_artwork_links aal
        WHERE aal.album_id = al.id
        ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
        LIMIT 1
      ) AS artwork_path,
      (
        SELECT aal.r2_cover_key FROM album_artwork_links aal
        WHERE aal.album_id = al.id
        ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
        LIMIT 1
      ) AS r2_cover_key
    FROM album_external_keys aek
    JOIN albums al ON al.id = aek.album_id
    JOIN artists ar ON ar.id = al.artist_id
    WHERE upper(trim(aek.external_key)) = upper(trim($1))
    LIMIT 1
    `,
    [rval],
  );

  const header = headerRows[0];
  if (!header) return null;

  const pgAlbumId = header.pg_album_id;
  const title = header.title.trim();
  const artistName = displayArtistName(header.artist_name.trim());
  const artistSlug = slugFromArtistName(artistName);
  const releaseYear = header.release_year;
  const coverUrl = pickCoverUrl(header.cover_path, header.artwork_path, header.r2_cover_key);

  const [chartRows, trackRows, statsRows, hot100Singles] = await Promise.all([
    inspectQuery<{
      chart_date: string;
      chart_name: string;
      chart_position: number;
      weeks_on_chart: number;
    }>(
      `
      SELECT ca.chart_date::text AS chart_date, ca.chart_name, ca.chart_position,
             COALESCE(ca.weeks_on_chart, 0)::int AS weeks_on_chart
      FROM chart_appearances ca
      WHERE ca.album_id = $1
        AND ca.chart_name = 'Billboard 200'
      ORDER BY ca.chart_date ASC, ca.chart_position ASC
      `,
      [pgAlbumId],
    ),
    inspectQuery<{
      position: number;
      title: string;
      rvtr: string | null;
      cover_path: string | null;
      artwork_path: string | null;
      r2_cover_key: string | null;
    }>(
      `
      SELECT cat.position, cat.title, cat.canonical_track_key AS rvtr,
             al.canonical_cover_path AS cover_path,
             (
               SELECT aal.canonical_cover_path FROM album_artwork_links aal
               WHERE aal.album_id = al.id
               ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
               LIMIT 1
             ) AS artwork_path,
             (
               SELECT aal.r2_cover_key FROM album_artwork_links aal
               WHERE aal.album_id = al.id
               ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
               LIMIT 1
             ) AS r2_cover_key
      FROM canonical_album_tracks cat
      JOIN albums al ON al.id = cat.album_id
      WHERE cat.album_id = $1
      ORDER BY cat.position ASC
      `,
      [pgAlbumId],
    ),
    inspectQuery<{
      b200_peak: number | null;
      chart_weeks: number;
      first_chart_date: string | null;
      last_chart_date: string | null;
    }>(
      `
      SELECT
        min(ca.chart_position) AS b200_peak,
        max(COALESCE(ca.weeks_on_chart, 0))::int AS chart_weeks,
        min(ca.chart_date)::text AS first_chart_date,
        max(ca.chart_date)::text AS last_chart_date
      FROM chart_appearances ca
      WHERE ca.album_id = $1
        AND ca.chart_name = 'Billboard 200'
      `,
      [pgAlbumId],
    ),
    inspectQuery<{ title: string; peak_hot100: number | null }>(
      `
      SELECT cat.title,
             min(ct.peak_hot100_position) AS peak_hot100
      FROM canonical_album_tracks cat
      JOIN canonical_tracks ct ON upper(trim(ct.track_id)) = upper(trim(cat.canonical_track_key))
      WHERE cat.album_id = $1
        AND ct.peak_hot100_position IS NOT NULL
      GROUP BY cat.title
      ORDER BY peak_hot100 ASC NULLS LAST
      LIMIT 8
      `,
      [pgAlbumId],
    ),
  ]);

  const stats = statsRows[0];
  const b200Peak = stats?.b200_peak ?? null;
  const firstChartDate = stats?.first_chart_date?.slice(0, 10) ?? null;
  const lastChartDate = stats?.last_chart_date?.slice(0, 10) ?? null;

  const trajectoryWeeks = chartsToTrajectoryWeeks(
    chartRows.map((row) => ({
      chart_date: row.chart_date.slice(0, 10),
      chart_position: row.chart_position,
      weeks_on_chart: row.weeks_on_chart,
    })),
    { maxRank: 200 },
  );

  const chartWeeks = trajectoryWeeks.length;

  const weeksAtPeak = weeksAtPeakRank(trajectoryWeeks, b200Peak);
  const weeksAtNumberOne = trajectoryWeeks.filter((week) => week.rank === 1).length;

  const trackRvtrs = trackRows
    .map((row) => row.rvtr?.trim().toUpperCase() ?? null)
    .filter((rvtr): rvtr is string => rvtr != null && RE_RVTR.test(rvtr));

  const coverageMap = await loadTrackCoverageByRvtr(trackRvtrs);

  const tracks: AlbumTrackRow[] = trackRows.map((row) => {
    const rvtr = row.rvtr?.trim().toUpperCase() ?? null;
    const navigable = rvtr != null && RE_RVTR.test(rvtr);
    return {
      position: row.position,
      title: row.title.trim(),
      rvtr: navigable ? rvtr : null,
      href: navigable ? trackPageHref(rvtr) : null,
      coverageStatus: navigable ? (coverageMap.get(rvtr) ?? "missing") : "missing",
      coverUrl: pickCoverUrl(row.cover_path, row.artwork_path, row.r2_cover_key) ?? coverUrl,
    };
  });

  const majorSinglesFromChart = hot100Singles
    .filter((row) => row.peak_hot100 != null && row.peak_hot100 <= 40)
    .sort((a, b) => (a.peak_hot100 ?? 999) - (b.peak_hot100 ?? 999))
    .map((row) => row.title.trim());

  const sourceHints = await loadAlbumSourceHints(title, trackRvtrs);

  const description = buildAlbumDescription({
    title,
    artistName,
    releaseYear,
    trackCount: tracks.length,
    b200Peak,
    chartWeeks,
    weeksAtNumberOne,
    source: sourceHints,
    majorSinglesFromChart,
  });

  const chartFeatures = buildAlbumChartFeatures(trajectoryWeeks, b200Peak);
  const featuresIndex = await loadAlbumChartFeaturesIndex();

  let similarChartJourneys: SimilarAlbumMatch[] = [];
  if (chartFeatures && featuresIndex) {
    const coverByRval = new Map<string, string | null>();
    const hrefByRval = new Map<string, string>();

    for (const row of featuresIndex.albums) {
      const href = albumSuggestionHref(row.title, `/album/${row.rval}`);
      if (href?.startsWith("/album/")) hrefByRval.set(row.rval, href);
    }

    const similarRows = featuresIndex.albums.filter((row) => hrefByRval.has(row.rval));
    const similarRvals = rankSimilarAlbumChartJourneys({
      currentRval: rval,
      currentTitleKey: albumTitleKey(title),
      current: chartFeatures,
      candidates: similarRows,
      coverByRval,
      hrefByRval,
      limit: 4,
    });

    if (similarRvals.length > 0) {
      const coverRows = await inspectQuery<{
        rval: string;
        cover_path: string | null;
        artwork_path: string | null;
        r2_cover_key: string | null;
      }>(
        `
        SELECT upper(trim(aek.external_key)) AS rval,
               al.canonical_cover_path AS cover_path,
               (
                 SELECT aal.canonical_cover_path FROM album_artwork_links aal
                 WHERE aal.album_id = al.id
                 ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
                 LIMIT 1
               ) AS artwork_path,
               (
                 SELECT aal.r2_cover_key FROM album_artwork_links aal
                 WHERE aal.album_id = al.id
                 ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST
                 LIMIT 1
               ) AS r2_cover_key
        FROM album_external_keys aek
        JOIN albums al ON al.id = aek.album_id
        WHERE upper(trim(aek.external_key)) = ANY($1::text[])
        `,
        [similarRvals.map((row) => row.rval)],
      );

      for (const row of coverRows) {
        coverByRval.set(row.rval, pickCoverUrl(row.cover_path, row.artwork_path, row.r2_cover_key));
      }

      similarChartJourneys = similarRvals.map((row) => ({
        ...row,
        coverUrl: coverByRval.get(row.rval) ?? row.coverUrl ?? null,
      }));
    }
  }

  const rvYear = releaseYear ?? yearFromDate(firstChartDate ?? trajectoryWeeks[0]?.issueDate);
  const peakWeekDate =
    (typeof b200Peak === "number"
      ? trajectoryWeeks.find((w) => w.rank === b200Peak)?.issueDate
      : null) ??
    trajectoryWeeks[trajectoryWeeks.length - 1]?.issueDate ??
    firstChartDate;

  const relatedExperiences: Array<{ label: string; href: string }> = [];
  if (rvYear != null) {
    relatedExperiences.push({ label: `${rvYear} chart year`, href: rvYearHref(rvYear) });
  }
  if (peakWeekDate) {
    const weekHref = rvChronologyHrefFromChartDate(peakWeekDate, rvYear);
    if (weekHref) relatedExperiences.push({ label: "Peak chart week", href: weekHref });
  }

  const info: AlbumInfoSection = {
    releaseDate: sourceHints.releaseDates[0] ?? null,
    label: sourceHints.labels[0] ?? null,
    genres: sourceHints.genres,
    certifications: sourceHints.certifications,
    awards: sourceHints.awards,
    majorSingles:
      majorSinglesFromChart.length > 0
        ? majorSinglesFromChart
        : sourceHints.majorSingles,
    artistHref: `/artist/${artistSlug}`,
    yearHref: rvYear != null ? rvYearHref(rvYear) : null,
    relatedExperiences,
  };

  return {
    rval,
    title,
    artistName,
    artistSlug,
    artistHref: `/artist/${artistSlug}`,
    releaseYear: rvYear,
    coverUrl,
    b200Peak,
    chartWeeks,
    weeksAtPeak,
    weeksAtNumberOne,
    firstChartDate,
    lastChartDate,
    trajectoryWeeks,
    chartRunLabel: "Billboard 200",
    description,
    journeySummary: null,
    tracks,
    similarChartJourneys,
    info,
    rvYearHref: rvChronologyHrefFromChartDate(peakWeekDate ?? firstChartDate, rvYear),
  };
}
