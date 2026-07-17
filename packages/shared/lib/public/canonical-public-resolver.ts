import "server-only";

import { cache } from "react";

import { resolveAlbumCoverUrlFromRow } from "@/lib/artwork/resolve-album-cover-url";
import { WINNING_ARTWORK_LINK_ORDER } from "@/lib/artwork/winning-artwork-link-sql";
import { displayArtistName } from "@/lib/artist/slug";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { normalizeRVYear } from "@/lib/search/normalize-rv-year";
import {
  resolvePrimaryAlbum,
  type PrimaryAlbumCandidate,
  type PrimaryAlbumResolution,
} from "@/lib/public/primary-album-policy";

const RE_RVTR = /^RVTR\d{6}$/i;
const RE_RVAL = /^RVAL\d{6}$/i;

export type PublicLoaderTiming = {
  name: string;
  durationMs: number;
};

export type CanonicalChartRelationship = {
  chartDate: string;
  chartName: string;
  chartPosition: number;
  weeksOnChart: number;
};

export type CanonicalArtistIdentity = {
  artistId: number;
  rvar: string;
  canonicalName: string;
  displayName: string;
  routeToken: string;
  href: string;
  resolverPath: string[];
  loaderTimings: PublicLoaderTiming[];
};

export type CanonicalAlbumIdentity = {
  albumId: number;
  artistId: number;
  rval: string;
  title: string;
  releaseYear: number | null;
  artistCanonicalName: string;
  artistDisplayName: string;
  artistHref: string;
  coverUrl: string | null;
  resolverPath: string[];
  loaderTimings: PublicLoaderTiming[];
};

export type CanonicalTrackResolution = {
  canonicalTrackId: number;
  rvtr: string;
  title: string;
  graphTrackId: number | null;
  trackFamilyId: number | null;
  artist: CanonicalArtistIdentity;
  canonicalYear: number | null;
  firstChartDate: string | null;
  peakHot100Position: number | null;
  chartWeeks: number;
  hasHot100: boolean;
  hasVdjMedia: boolean;
  albumResolution: PrimaryAlbumResolution;
  chartRelationships: CanonicalChartRelationship[];
  resolverPath: string[];
  loaderTimings: PublicLoaderTiming[];
};

export type CanonicalTrackBatchItem = {
  rvtr: string;
  title: string;
  artist: CanonicalArtistIdentity;
  canonicalYear: number | null;
  albumResolution: PrimaryAlbumResolution;
};

type TrackIdentityRow = {
  canonical_track_id: string | number;
  rvtr: string;
  canonical_title: string;
  artist_id: string | number;
  artist_rvar: string;
  artist_canonical_name: string;
  graph_track_id: string | number | null;
  track_family_id: string | number | null;
  first_chart_date: string | null;
  peak_hot100_position: number | null;
  chart_weeks: number;
  has_hot100: boolean;
  has_vdj_media: boolean;
};

type AlbumCandidateRow = {
  rvtr: string;
  album_id: string | number;
  artist_id: string | number;
  title: string;
  release_year: number | null;
  rval: string | null;
  cover_path: string | null;
  artwork_path: string | null;
  r2_cover_key: string | null;
  relationship_type: string | null;
  relationship_confidence: string | number | null;
  canonical_source: string | null;
  membership_confidence: string | number | null;
  review_flag: string | null;
  position: number | null;
  first_billboard_200_date: string | null;
};

function asNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function yearFromDate(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const year = Number(value.slice(0, 4));
  return Number.isFinite(year) && year > 0 ? year : null;
}

function durationMs(startedAt: number): number {
  return Math.round((performance.now() - startedAt) * 100) / 100;
}

export function canonicalArtistHref(rvar: string): string {
  return `/artist/${rvar}`;
}

function artistIdentityFromRow(row: Pick<TrackIdentityRow, "artist_id" | "artist_canonical_name" | "artist_rvar">): CanonicalArtistIdentity {
  const artistId = asNumber(row.artist_id) ?? 0;
  const canonicalName = row.artist_canonical_name.trim();
  return {
    artistId,
    rvar: row.artist_rvar.trim().toUpperCase(),
    canonicalName,
    displayName: displayArtistName(canonicalName),
    routeToken: row.artist_rvar.trim().toUpperCase(),
    href: canonicalArtistHref(row.artist_rvar.trim().toUpperCase()),
    resolverPath: [`RVAR:${row.artist_rvar}`, `artist_id:${artistId}`, "artists.id"],
    loaderTimings: [],
  };
}

async function loadTrackIdentityRows(rvtrs: string[]): Promise<TrackIdentityRow[]> {
  if (rvtrs.length === 0) return [];
  return inspectQuery<TrackIdentityRow>(
    `
    SELECT
      ctd.id AS canonical_track_id,
      upper(trim(ctd.track_id)) AS rvtr,
      ctd.canonical_title,
      ctd.artist_id,
      ar.canonical_name AS artist_canonical_name,
      ar.rvar AS artist_rvar,
      ctd.graph_track_id,
      ctd.track_family_id,
      ctd.first_chart_date::text AS first_chart_date,
      ctd.peak_hot100_position,
      ctd.chart_weeks,
      ctd.has_hot100,
      ctd.has_vdj_media
    FROM canonical_track_display ctd
    JOIN artists ar ON ar.id = ctd.artist_id
    WHERE upper(trim(ctd.track_id)) = ANY($1::text[])
    `,
    [rvtrs],
  );
}

async function loadAlbumCandidatesForRvtrs(rvtrs: string[]): Promise<Map<string, PrimaryAlbumCandidate[]>> {
  const result = new Map<string, PrimaryAlbumCandidate[]>();
  for (const rvtr of rvtrs) result.set(rvtr, []);
  if (rvtrs.length === 0) return result;

  const rows = await inspectQuery<AlbumCandidateRow>(
    `
    WITH requested AS (
      SELECT upper(trim(ctd.track_id)) AS rvtr, ctd.track_family_id
      FROM canonical_track_display ctd
      WHERE upper(trim(ctd.track_id)) = ANY($1::text[])
    ), candidate_ids AS (
      SELECT r.rvtr, cat.album_id
      FROM requested r
      JOIN canonical_album_tracks cat
        ON upper(trim(cat.canonical_track_key)) = r.rvtr
        OR (r.track_family_id IS NOT NULL AND cat.track_family_id = r.track_family_id)
      UNION
      SELECT r.rvtr, link.album_id
      FROM requested r
      JOIN canonical_track_album_links link
        ON r.track_family_id IS NOT NULL AND link.track_family_id = r.track_family_id
      UNION
      SELECT r.rvtr, membership.album_id
      FROM requested r
      JOIN rvtr_album_memberships membership ON upper(trim(membership.rvtr)) = r.rvtr
    )
    SELECT
      candidates.rvtr,
      al.id AS album_id,
      al.artist_id,
      ar.rvar AS artist_rvar,
      al.title,
      al.release_year,
      external_key.rval,
      al.canonical_cover_path AS cover_path,
      (
        SELECT aal.canonical_cover_path FROM album_artwork_links aal
        WHERE aal.album_id = al.id
        ${WINNING_ARTWORK_LINK_ORDER}
      ) AS artwork_path,
      (
        SELECT aal.r2_cover_key FROM album_artwork_links aal
        WHERE aal.album_id = al.id
        ${WINNING_ARTWORK_LINK_ORDER}
      ) AS r2_cover_key,
      relationship.relationship_type,
      relationship.confidence_score AS relationship_confidence,
      COALESCE(membership.canonical_source, sequence.canonical_source) AS canonical_source,
      COALESCE(membership.confidence_score, sequence.confidence_score) AS membership_confidence,
      COALESCE(relationship.review_flag, membership.review_flag, sequence.review_flag) AS review_flag,
      COALESCE(membership.sequence_position, sequence.position) AS position
      ,(
        SELECT min(ca.chart_date)::text FROM chart_appearances ca
        WHERE ca.album_id = al.id AND ca.chart_name ~* 'Billboard[[:space:]]+200'
      ) AS first_billboard_200_date
    FROM candidate_ids candidates
    JOIN albums al ON al.id = candidates.album_id
    JOIN artists ar ON ar.id = al.artist_id
    LEFT JOIN LATERAL (
      SELECT upper(trim(aek.external_key)) AS rval
      FROM album_external_keys aek
      WHERE aek.album_id = al.id AND aek.external_key ~* '^RVAL\\d{6}$'
      ORDER BY aek.confidence_score DESC NULLS LAST, aek.created_at ASC
      LIMIT 1
    ) external_key ON true
    LEFT JOIN LATERAL (
      SELECT link.relationship_type, link.confidence_score, link.review_flag
      FROM canonical_track_album_links link
      JOIN requested r ON r.rvtr = candidates.rvtr
      WHERE link.album_id = al.id
        AND r.track_family_id IS NOT NULL
        AND link.track_family_id = r.track_family_id
      ORDER BY link.confidence_score DESC NULLS LAST, link.id ASC
      LIMIT 1
    ) relationship ON true
    LEFT JOIN LATERAL (
      SELECT membership.canonical_source, membership.confidence_score,
             membership.review_flag, membership.sequence_position
      FROM rvtr_album_memberships membership
      WHERE membership.album_id = al.id
        AND upper(trim(membership.rvtr)) = candidates.rvtr
      ORDER BY membership.confidence_score DESC NULLS LAST, membership.id ASC
      LIMIT 1
    ) membership ON true
    LEFT JOIN LATERAL (
      SELECT cat.canonical_source, cat.confidence_score, cat.review_flag, cat.position
      FROM canonical_album_tracks cat
      JOIN requested r ON r.rvtr = candidates.rvtr
      WHERE cat.album_id = al.id
        AND (
          upper(trim(cat.canonical_track_key)) = candidates.rvtr
          OR (r.track_family_id IS NOT NULL AND cat.track_family_id = r.track_family_id)
        )
      ORDER BY
        (upper(trim(cat.canonical_track_key)) = candidates.rvtr) DESC,
        cat.confidence_score DESC NULLS LAST,
        cat.id ASC
      LIMIT 1
    ) sequence ON true
    ORDER BY candidates.rvtr, al.id
    `,
    [rvtrs],
  );

  for (const row of rows) {
    const rvtr = row.rvtr.trim().toUpperCase();
    const albumId = asNumber(row.album_id);
    const artistId = asNumber(row.artist_id);
    if (albumId == null || artistId == null) continue;
    const candidate: PrimaryAlbumCandidate = {
      albumId,
      artistId,
      title: row.title.trim(),
      releaseYear: row.release_year,
      rval: RE_RVAL.test(row.rval?.trim() ?? "") ? row.rval!.trim().toUpperCase() : null,
      coverUrl: resolveAlbumCoverUrlFromRow(row),
      relationshipType: row.relationship_type?.trim() || null,
      relationshipConfidence: asNumber(row.relationship_confidence),
      canonicalSource: row.canonical_source?.trim() || null,
      membershipConfidence: asNumber(row.membership_confidence),
      reviewFlag: row.review_flag?.trim() || null,
      position: row.position,
      firstBillboard200Date: row.first_billboard_200_date?.slice(0, 10) ?? null,
    };
    const group = result.get(rvtr) ?? [];
    group.push(candidate);
    result.set(rvtr, group);
  }

  return result;
}

async function resolveCanonicalTrackImpl(rvtrParam: string): Promise<CanonicalTrackResolution | null> {
  const ping = await inspectPing();
  if (!ping.ok) return null;

  const rvtr = decodeURIComponent(rvtrParam).trim().toUpperCase();
  if (!RE_RVTR.test(rvtr)) return null;

  const timings: PublicLoaderTiming[] = [];
  let startedAt = performance.now();
  const track = (await loadTrackIdentityRows([rvtr]))[0];
  timings.push({ name: "canonical-track", durationMs: durationMs(startedAt) });
  if (!track) return null;

  const graphTrackId = asNumber(track.graph_track_id);
  startedAt = performance.now();
  const [albumCandidatesByRvtr, chartRows] = await Promise.all([
    loadAlbumCandidatesForRvtrs([rvtr]),
    graphTrackId == null
      ? Promise.resolve([])
      : inspectQuery<{
          chart_date: string;
          chart_name: string;
          chart_position: number;
          weeks_on_chart: number;
        }>(
          `
          SELECT ca.chart_date::text AS chart_date, ca.chart_name, ca.chart_position,
                 COALESCE(ca.weeks_on_chart, 0)::int AS weeks_on_chart
          FROM chart_appearances ca
          WHERE ca.track_id = $1
          ORDER BY CASE WHEN ca.chart_name ILIKE '%Hot 100%' THEN 0 ELSE 1 END,
                   ca.chart_date ASC, ca.chart_position ASC
          `,
          [graphTrackId],
        ),
  ]);
  timings.push({ name: "canonical-relationships", durationMs: durationMs(startedAt) });

  const artist = artistIdentityFromRow(track);
  const canonicalYear = yearFromDate(track.first_chart_date);
  startedAt = performance.now();
  const albumResolution = resolvePrimaryAlbum({
    canonicalArtistId: artist.artistId,
    canonicalYear,
    candidates: albumCandidatesByRvtr.get(rvtr) ?? [],
  });
  timings.push({ name: "primary-album-policy", durationMs: durationMs(startedAt) });

  const chartRelationships: CanonicalChartRelationship[] = chartRows.map((row) => ({
    chartDate: row.chart_date.slice(0, 10),
    chartName: row.chart_name.trim(),
    chartPosition: row.chart_position,
    weeksOnChart: row.weeks_on_chart,
  }));
  const primaryAlbumId = albumResolution.primaryAlbum?.albumId ?? null;
  const canonicalTrackId = asNumber(track.canonical_track_id) ?? 0;

  return {
    canonicalTrackId,
    rvtr,
    title: track.canonical_title.trim(),
    graphTrackId,
    trackFamilyId: asNumber(track.track_family_id),
    artist,
    canonicalYear,
    firstChartDate: track.first_chart_date?.slice(0, 10) ?? null,
    peakHot100Position: track.peak_hot100_position,
    chartWeeks: track.chart_weeks,
    hasHot100: track.has_hot100,
    hasVdjMedia: track.has_vdj_media,
    albumResolution,
    chartRelationships,
    resolverPath: [
      `RVTR:${rvtr}`,
      `canonical_track:${canonicalTrackId}`,
      `artist_id:${artist.artistId}`,
      `album_id:${primaryAlbumId ?? "none"}`,
      `canonical_year:${canonicalYear ?? "none"}`,
      `chart_relationships:${chartRelationships.length}`,
      "render",
    ],
    loaderTimings: timings,
  };
}

export const resolveCanonicalTrack = cache(resolveCanonicalTrackImpl);

async function resolveCanonicalArtistImpl(identityParam: string): Promise<CanonicalArtistIdentity | null> {
  const rvar = decodeURIComponent(identityParam).trim().toUpperCase();
  if (!/^RVAR\d{6}$/.test(rvar)) return null;

  const startedAt = performance.now();
  const rows = await inspectQuery<{ id: string | number; rvar: string; canonical_name: string }>(
    `SELECT id, rvar, canonical_name FROM artists WHERE upper(trim(rvar)) = $1 LIMIT 1`,
    [rvar],
  );
  const row = rows[0];
  if (!row) return null;
  const canonicalName = row.canonical_name.trim();
  return {
    artistId: Number(row.id),
    rvar: row.rvar.trim().toUpperCase(),
    canonicalName,
    displayName: displayArtistName(canonicalName),
    routeToken: row.rvar.trim().toUpperCase(),
    href: canonicalArtistHref(row.rvar),
    resolverPath: [`RVAR:${row.rvar}`, `artist_id:${row.id}`, "artists.id", "render"],
    loaderTimings: [{ name: "canonical-artist", durationMs: durationMs(startedAt) }],
  };
}

export const resolveCanonicalArtist = cache(resolveCanonicalArtistImpl);

/** Legacy compatibility only: numeric IDs may redirect, but never resolve canonically. */
export const resolveLegacyArtistId = cache(async (identityParam: string): Promise<CanonicalArtistIdentity | null> => {
  const raw = decodeURIComponent(identityParam).trim();
  if (!/^\d+$/.test(raw)) return null;
  const artistId = Number(raw);
  if (!Number.isSafeInteger(artistId) || artistId <= 0) return null;
  const rows = await inspectQuery<{ id: string | number; rvar: string; canonical_name: string }>(
    `SELECT id, rvar, canonical_name FROM artists WHERE id = $1 LIMIT 1`, [artistId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    artistId: Number(row.id), rvar: row.rvar.trim().toUpperCase(),
    canonicalName: row.canonical_name.trim(), displayName: displayArtistName(row.canonical_name.trim()),
    routeToken: row.rvar.trim().toUpperCase(), href: canonicalArtistHref(row.rvar),
    resolverPath: [`legacy_artist_id:${row.id}`, `RVAR:${row.rvar}`, "redirect"],
    loaderTimings: [],
  };
});

async function resolveCanonicalAlbumImpl(rvalParam: string): Promise<CanonicalAlbumIdentity | null> {
  const rval = decodeURIComponent(rvalParam).trim().toUpperCase();
  if (!RE_RVAL.test(rval)) return null;
  const startedAt = performance.now();
  const rows = await inspectQuery<{
    album_id: string | number;
    artist_id: string | number;
    artist_rvar: string;
    title: string;
    release_year: number | null;
    artist_name: string;
    cover_path: string | null;
    artwork_path: string | null;
    r2_cover_key: string | null;
  }>(
    `
    SELECT
      al.id AS album_id,
      al.artist_id,
      al.title,
      al.release_year,
      ar.canonical_name AS artist_name,
      ar.rvar AS artist_rvar,
      al.canonical_cover_path AS cover_path,
      (
        SELECT aal.canonical_cover_path FROM album_artwork_links aal
        WHERE aal.album_id = al.id
        ${WINNING_ARTWORK_LINK_ORDER}
      ) AS artwork_path,
      (
        SELECT aal.r2_cover_key FROM album_artwork_links aal
        WHERE aal.album_id = al.id
        ${WINNING_ARTWORK_LINK_ORDER}
      ) AS r2_cover_key
    FROM album_external_keys aek
    JOIN albums al ON al.id = aek.album_id
    JOIN artists ar ON ar.id = al.artist_id
    WHERE upper(trim(aek.external_key)) = $1
    ORDER BY aek.confidence_score DESC NULLS LAST, aek.created_at ASC
    LIMIT 1
    `,
    [rval],
  );
  const row = rows[0];
  const albumId = asNumber(row?.album_id);
  const artistId = asNumber(row?.artist_id);
  if (!row || albumId == null || artistId == null) return null;
  const artistCanonicalName = row.artist_name.trim();

  return {
    albumId,
    artistId,
    rval,
    title: row.title.trim(),
    releaseYear: row.release_year,
    artistCanonicalName,
    artistDisplayName: displayArtistName(artistCanonicalName),
    artistHref: canonicalArtistHref(row.artist_rvar.trim().toUpperCase()),
    coverUrl: resolveAlbumCoverUrlFromRow(row),
    resolverPath: [`RVAL:${rval}`, `album_id:${albumId}`, `artist_id:${artistId}`, "render"],
    loaderTimings: [{ name: "canonical-album", durationMs: durationMs(startedAt) }],
  };
}

export const resolveCanonicalAlbum = cache(resolveCanonicalAlbumImpl);

export function resolveCanonicalYear(yearParam: string | number): {
  year: number;
  resolverPath: string[];
} | null {
  const year = normalizeRVYear(yearParam);
  return year == null ? null : { year, resolverPath: [`canonical_year:${year}`, "render"] };
}

/** Batch resolver for Year and Discovery shelves; it never re-enters through names. */
export async function resolveCanonicalTracksBatch(rvtrParams: string[]): Promise<Map<string, CanonicalTrackBatchItem>> {
  const rvtrs = [...new Set(rvtrParams.map((value) => value.trim().toUpperCase()).filter((value) => RE_RVTR.test(value)))];
  if (rvtrs.length === 0) return new Map();
  const [tracks, candidatesByRvtr] = await Promise.all([
    loadTrackIdentityRows(rvtrs),
    loadAlbumCandidatesForRvtrs(rvtrs),
  ]);

  return new Map(
    tracks.map((track) => {
      const rvtr = track.rvtr.trim().toUpperCase();
      const artist = artistIdentityFromRow(track);
      const canonicalYear = yearFromDate(track.first_chart_date);
      return [
        rvtr,
        {
          rvtr,
          title: track.canonical_title.trim(),
          artist,
          canonicalYear,
          albumResolution: resolvePrimaryAlbum({
            canonicalArtistId: artist.artistId,
            canonicalYear,
            candidates: candidatesByRvtr.get(rvtr) ?? [],
          }),
        },
      ] as const;
    }),
  );
}
