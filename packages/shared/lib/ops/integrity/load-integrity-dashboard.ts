import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

type CountRow = { count: number };

export type IntegrityRecord = {
  id: string;
  label: string;
  detail: string;
  href?: string | null;
};

export type IntegrityCard = {
  id: string;
  title: string;
  count: number;
  severity: "ok" | "warn" | "bad";
  description: string;
  records: IntegrityRecord[];
};

export type IntegrityTrace = {
  rvtr: string;
  title: string | null;
  artistName: string | null;
  canonicalArtistId: string | null;
  albumTitle: string | null;
  canonicalAlbumId: string | null;
  year: number | null;
  chartRelationships: Array<{ chartName: string; chartDate: string; rank: number; resolver: string }>;
  artworkSource: string | null;
  aliases: Array<{ label: string; source: string }>;
  publicPages: Array<{ label: string; href: string; status: "canonical" | "name-derived" | "missing"; resolver: string }>;
  findings: Array<{ label: string; ok: boolean; note: string; resolver: string }>;
};

export type IntegritySearchResult = {
  rvtr: string;
  title: string;
  artistName: string;
  albumTitle: string | null;
  year: number | null;
  matchType: "rvtr" | "song" | "artist" | "album";
};

export type IntegrityDashboardData = {
  ok: boolean;
  error?: string;
  generatedAt: string;
  cards: IntegrityCard[];
  priorityCards: IntegrityCard[];
  albumReviewQueue: AlbumReviewQueueData | null;
  searchQuery: string;
  searchResults: IntegritySearchResult[];
  trace: IntegrityTrace | null;
  totalOpenIssues: number;
  cockpitStatus: "Healthy" | "Attention" | "Critical";
};

export type AlbumReviewQueueItem = {
  rvtr: string;
  title: string;
  artistName: string;
  canonicalArtistId: string | null;
  graphTrackId: string | null;
  firstChartDate: string | null;
  peakHot100Position: number | null;
  chartWeeks: number;
  existingAlbumLinks: Array<{
    albumId: string;
    albumTitle: string;
    rval: string | null;
    position: number | null;
    coverSource: string | null;
  }>;
  proposedAlbumId: string | null;
  proposedAlbumTitle: string | null;
  proposedRval: string | null;
  proposedReleaseYear: number | null;
  proposedPosition: number | null;
  proposedSlotTitle: string | null;
  albumType: string;
  coverSource: string | null;
  competingCandidates: Array<{
    albumId: string;
    albumTitle: string;
    rval: string | null;
    releaseYear: number | null;
    position: number | null;
    slotTitle: string | null;
  }>;
  mediaEvidence: Array<{
    sourcePath: string | null;
    artistText: string | null;
    titleText: string | null;
    albumText: string | null;
    durationSeconds: number | null;
    confidenceScore: number | null;
  }>;
  warnings: string[];
  confidence: number;
  publicLinks: Array<{ label: string; href: string | null }>;
};

export type AlbumReviewQueueData = {
  generatedAt: string;
  total: number;
  promotedReadOnly: number;
  bobReview: number;
  unresolved: number;
  items: AlbumReviewQueueItem[];
};

const SAMPLE_LIMIT = 12;
const DEFAULT_RVTR = "RVTR280043";
const ACTIVE_CARD_IDS = new Set([
  "duplicate-artists",
  "duplicate-albums",
  "duplicate-tracks",
  "alias-conflicts",
  "missing-covers",
  "orphan-tracks",
  "broken-artist-links",
  "broken-album-links",
  "multiple-canonical-candidates",
  "unresolved-routes",
]);

function count(rows: CountRow[]): number {
  return Number(rows[0]?.count ?? 0);
}

function severity(n: number): IntegrityCard["severity"] {
  if (n === 0) return "ok";
  if (n < 25) return "warn";
  return "bad";
}

async function card(
  id: string,
  title: string,
  description: string,
  countSql: string,
  recordSql: string,
): Promise<IntegrityCard> {
  const [countRows, records] = await Promise.all([
    inspectQuery<CountRow>(countSql),
    inspectQuery<IntegrityRecord>(recordSql, [SAMPLE_LIMIT]),
  ]);
  const n = count(countRows);
  return { id, title, count: n, severity: severity(n), description, records };
}

export function cockpitStatusForIssues(totalOpenIssues: number): IntegrityDashboardData["cockpitStatus"] {
  if (totalOpenIssues === 0) return "Healthy";
  if (totalOpenIssues < 100) return "Attention";
  return "Critical";
}

export function integrityWarningCount(trace: IntegrityTrace | null): number {
  return trace?.findings.filter((finding) => !finding.ok).length ?? 0;
}

export async function loadIntegrityTrace(input: string = DEFAULT_RVTR): Promise<IntegrityTrace | null> {
  const rvtr = input.trim().toUpperCase();
  if (!/^RVTR\d{6}$/.test(rvtr)) return null;

  const rows = await inspectQuery<{
    rvtr: string;
    title: string | null;
    artist_name: string | null;
    artist_id: string | null;
    album_title: string | null;
    album_id: string | null;
    year: number | null;
    cover_source: string | null;
  }>(
    `
    WITH track AS (
      SELECT
        upper(trim(ctd.track_id)) AS rvtr,
        ctd.canonical_title AS title,
        ctd.canonical_artist_name AS artist_name,
        ctd.first_chart_date,
        ct.graph_track_id
      FROM canonical_track_display ctd
      LEFT JOIN canonical_tracks ct
        ON upper(trim(ct.track_id)) = upper(trim(ctd.track_id))
        OR upper(trim(coalesce(ct.retroverse_track_id, ''))) = upper(trim(ctd.track_id))
      WHERE upper(trim(ctd.track_id)) = $1
      LIMIT 1
    ),
    album AS (
      SELECT al.id::text AS album_id, al.title AS album_title,
             upper(trim(aek.external_key)) AS rval,
             CASE
               WHEN al.canonical_cover_path IS NOT NULL THEN 'albums.canonical_cover_path'
               WHEN aal.canonical_cover_path IS NOT NULL THEN 'album_artwork_links.canonical_cover_path'
               WHEN aal.r2_cover_key IS NOT NULL THEN 'album_artwork_links.r2_cover_key'
               ELSE NULL
             END AS cover_source
      FROM canonical_album_tracks cat
      JOIN albums al ON al.id = cat.album_id
      LEFT JOIN album_external_keys aek ON aek.album_id = al.id AND aek.external_key ~* '^RVAL[0-9]{6}$'
      LEFT JOIN LATERAL (
        SELECT canonical_cover_path, r2_cover_key
        FROM album_artwork_links aal
        WHERE aal.album_id = al.id
        ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC,
                 aal.confidence_score DESC NULLS LAST,
                 aal.updated_at DESC NULLS LAST,
                 aal.id DESC
        LIMIT 1
      ) aal ON true
      WHERE upper(trim(cat.canonical_track_key)) = $1
      ORDER BY cat.position ASC, al.id ASC
      LIMIT 1
    )
    SELECT
      t.rvtr,
      t.title,
      t.artist_name,
      ar.id::text AS artist_id,
      a.album_title,
      a.rval AS album_id,
      extract(year FROM t.first_chart_date)::int AS year,
      a.cover_source
    FROM track t
    LEFT JOIN artists ar ON lower(regexp_replace(trim(ar.canonical_name), '^the\\s+', '', 'i')) =
      lower(regexp_replace(trim(t.artist_name), '^the\\s+', '', 'i'))
    LEFT JOIN album a ON true
    `,
    [rvtr],
  );
  const row = rows[0];
  if (!row) return null;

  const [aliasRows, chartRows] = await Promise.all([
    inspectQuery<{ alias: string }>(
    `
    WITH needle AS (
      SELECT
        lower(regexp_replace(trim(coalesce($1, '')), '[^a-z0-9]+', '', 'g')) AS compact_artist,
        lower(regexp_replace(trim(coalesce($2, '')), '[^a-z0-9]+', '', 'g')) AS compact_title
    )
    SELECT DISTINCT ctd.canonical_artist_name AS alias
    FROM canonical_track_display ctd, needle n
    WHERE lower(regexp_replace(trim(ctd.canonical_title), '[^a-z0-9]+', '', 'g')) = n.compact_title
      AND lower(regexp_replace(trim(ctd.canonical_artist_name), '[^a-z0-9]+', '', 'g')) LIKE '%' || n.compact_artist || '%'
    ORDER BY alias
    LIMIT 10
    `,
    [row.artist_name, row.title],
    ),
    inspectQuery<{ chart_name: string; chart_date: string; rank: number }>(
      `
      SELECT ca.chart_name, ca.chart_date::text AS chart_date, ca.chart_position AS rank
      FROM chart_appearances ca
      JOIN canonical_tracks ct ON ct.graph_track_id = ca.track_id
      WHERE upper(trim(coalesce(ct.retroverse_track_id, ct.track_id))) = $1
         OR upper(trim(ct.track_id)) = $1
      ORDER BY CASE WHEN ca.chart_name = 'Billboard Hot 100' THEN 0 ELSE 1 END,
               ca.chart_date ASC,
               ca.chart_position ASC
      LIMIT 20
      `,
      [rvtr],
    ),
  ]);

  const artistSlug = (row.artist_name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  const primaryChart = chartRows[0] ?? null;
  const week = primaryChart?.chart_date?.slice(0, 10);
  const warnings = {
    artist: Boolean(row.artist_id),
    album: Boolean(row.album_id),
    year: Boolean(row.year),
    chart: chartRows.length > 0,
    artwork: Boolean(row.cover_source),
  };
  return {
    rvtr: row.rvtr,
    title: row.title,
    artistName: row.artist_name,
    canonicalArtistId: row.artist_id,
    albumTitle: row.album_title,
    canonicalAlbumId: row.album_id,
    year: row.year,
    chartRelationships: chartRows.map((chart) => ({
      chartName: chart.chart_name,
      chartDate: chart.chart_date,
      rank: chart.rank,
      resolver: "canonical_tracks.graph_track_id -> chart_appearances",
    })),
    artworkSource: row.cover_source,
    aliases: aliasRows.map((a) => ({ label: a.alias, source: "canonical_track_display artist/title normalization" })).filter((a) => Boolean(a.label)),
    publicPages: [
      { label: "Homepage", href: `/?q=${encodeURIComponent(row.rvtr)}`, status: "name-derived", resolver: "search/home query" },
      { label: "Song V3", href: `/retroverse-2/song/${row.rvtr}`, status: "canonical", resolver: "loadTrackPage(rvtr)" },
      { label: "Artist V3", href: artistSlug ? `/artist/${artistSlug}` : "/artist", status: artistSlug ? "name-derived" : "missing", resolver: "resolveArtistFromSlug(slug)" },
      { label: "Album V3", href: row.album_id ? `/album/${row.album_id}` : "/album", status: row.album_id ? "canonical" : "missing", resolver: "canonical_album_tracks -> album_external_keys" },
      { label: "Year V3", href: row.year ? `/rv/${row.year}` : "/rv", status: row.year ? "canonical" : "missing", resolver: "first_chart_date -> rv chronology" },
      { label: "Chart Week V3", href: week ? `/week/${week}?focus=${row.rvtr}` : "/week", status: week ? "name-derived" : "missing", resolver: "loadChartWeekContext(chartDate, focus)" },
    ],
    findings: [
      { label: "Canonical Track", ok: Boolean(row.rvtr), note: row.rvtr, resolver: "canonical_track_display" },
      { label: "Canonical Artist", ok: warnings.artist, note: row.artist_id ? `artists.id ${row.artist_id}` : "No artist row matched display artist.", resolver: "artists.canonical_name match" },
      { label: "Canonical Album", ok: warnings.album, note: row.album_id ?? "No album found through canonical_album_tracks.", resolver: "canonical_album_tracks" },
      { label: "Canonical Year", ok: warnings.year, note: row.year ? String(row.year) : "No first_chart_date year.", resolver: "canonical_track_display.first_chart_date" },
      { label: "Chart Relationships", ok: warnings.chart, note: chartRows.length ? `${chartRows.length} chart rows sampled` : "No chart appearance through graph_track_id.", resolver: "canonical_tracks -> chart_appearances" },
      { label: "Artwork Source", ok: warnings.artwork, note: row.cover_source ?? "No cover source found.", resolver: "albums / album_artwork_links" },
    ],
  };
}

export async function searchIntegrityRecords(query: string): Promise<IntegritySearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const isRvtr = /^RVTR\d{6}$/i.test(q);
  const rows = await inspectQuery<IntegritySearchResult>(
    `
    WITH album_match AS (
      SELECT upper(trim(cat.canonical_track_key)) AS rvtr, al.title AS album_title
      FROM albums al
      JOIN canonical_album_tracks cat ON cat.album_id = al.id
      WHERE lower(al.title) LIKE '%' || lower($1) || '%'
      LIMIT 30
    )
    SELECT DISTINCT ON (upper(trim(ctd.track_id)))
      upper(trim(ctd.track_id)) AS rvtr,
      ctd.canonical_title AS "title",
      ctd.canonical_artist_name AS "artistName",
      am.album_title AS "albumTitle",
      extract(year FROM ctd.first_chart_date)::int AS "year",
      CASE
        WHEN upper(trim(ctd.track_id)) = upper(trim($1)) THEN 'rvtr'
        WHEN lower(ctd.canonical_title) LIKE '%' || lower($1) || '%' THEN 'song'
        WHEN lower(ctd.canonical_artist_name) LIKE '%' || lower($1) || '%' THEN 'artist'
        ELSE 'album'
      END AS "matchType"
    FROM canonical_track_display ctd
    LEFT JOIN album_match am ON am.rvtr = upper(trim(ctd.track_id))
    WHERE ($2::boolean AND upper(trim(ctd.track_id)) = upper(trim($1)))
       OR lower(ctd.canonical_title) LIKE '%' || lower($1) || '%'
       OR lower(ctd.canonical_artist_name) LIKE '%' || lower($1) || '%'
       OR am.rvtr IS NOT NULL
    ORDER BY upper(trim(ctd.track_id)),
      CASE
        WHEN upper(trim(ctd.track_id)) = upper(trim($1)) THEN 0
        WHEN lower(ctd.canonical_title) LIKE '%' || lower($1) || '%' THEN 1
        WHEN lower(ctd.canonical_artist_name) LIKE '%' || lower($1) || '%' THEN 2
        ELSE 3
      END,
      ctd.has_hot100 DESC,
      ctd.peak_hot100_position ASC NULLS LAST,
      ctd.chart_weeks DESC
    LIMIT 20
    `,
    [q, isRvtr],
  );
  return rows;
}

function albumTypeForTitle(title: string | null | undefined): string {
  const value = title ?? "";
  if (/\blive\b|\bin concert\b|\ben concert\b|\bstorytellers\b|\bunplugged\b/i.test(value)) return "live";
  if (/\bremix\b|\bedit\b|\bversion\b|\bdemo\b|\bacoustic\b/i.test(value)) return "alternate";
  if (/\bgreatest\b|\bbest of\b|\bvery best\b|\bessential/i.test(value)) return "compilation";
  if (/\bcollection\b|\banthology\b|\bhits\b|\bsingles\b|\bnumber ones\b|\bopus collection\b|\bultimate\b/i.test(value)) return "compilation";
  return "studio_candidate";
}

function warningsForAlbumReview(row: {
  proposed_album_title: string | null;
  proposed_release_year: number | null;
  first_chart_date: string | null;
  competing_candidates: unknown;
  existing_album_links: unknown;
  media_evidence: unknown;
}): string[] {
  const warnings: string[] = [];
  const albumType = albumTypeForTitle(row.proposed_album_title);
  if (albumType !== "studio_candidate") warnings.push(albumType);
  if (!row.proposed_release_year) warnings.push("missing_album_release_year");
  if (!row.first_chart_date) warnings.push("missing_chart_date");
  if (Array.isArray(row.competing_candidates) && row.competing_candidates.length > 1) warnings.push("competing_album_slots");
  if (Array.isArray(row.existing_album_links) && row.existing_album_links.length > 1) warnings.push("multiple_existing_album_links");
  if (Array.isArray(row.media_evidence) && row.media_evidence.length === 0) warnings.push("no_media_link_evidence");
  return warnings;
}

function parseArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function loadAlbumReviewQueue(limit = 160): Promise<AlbumReviewQueueData> {
  const artifact = await loadAlbumReviewQueueFromArtifact(limit);
  if (artifact) return artifact;

  const rows = await inspectQuery<{
    rvtr: string;
    title: string;
    artist_name: string;
    canonical_artist_id: string | null;
    graph_track_id: string | null;
    first_chart_date: string | null;
    peak_hot100_position: number | null;
    chart_weeks: number;
    existing_album_links: AlbumReviewQueueItem["existingAlbumLinks"];
    proposed_album_id: string | null;
    proposed_album_title: string | null;
    proposed_rval: string | null;
    proposed_release_year: number | null;
    proposed_position: number | null;
    proposed_slot_title: string | null;
    cover_source: string | null;
    competing_candidates: AlbumReviewQueueItem["competingCandidates"];
    media_evidence: AlbumReviewQueueItem["mediaEvidence"];
  }>(
    `
    WITH missing AS (
      SELECT
        upper(trim(ctd.track_id)) AS rvtr,
        ctd.canonical_title AS title,
        ctd.canonical_artist_name AS artist_name,
        ctd.first_chart_date::text AS first_chart_date,
        ctd.peak_hot100_position,
        ctd.chart_weeks::int,
        ct.graph_track_id::text AS graph_track_id,
        ar.id::text AS canonical_artist_id
      FROM canonical_track_display ctd
      LEFT JOIN canonical_tracks ct
        ON upper(trim(ct.track_id)) = upper(trim(ctd.track_id))
        OR upper(trim(coalesce(ct.retroverse_track_id, ''))) = upper(trim(ctd.track_id))
      LEFT JOIN artists ar
        ON lower(regexp_replace(trim(ar.canonical_name), '^the[[:space:]]+', '', 'i')) =
           lower(regexp_replace(trim(ctd.canonical_artist_name), '^the[[:space:]]+', '', 'i'))
      WHERE NOT EXISTS (
        SELECT 1 FROM canonical_album_tracks cat
        WHERE upper(trim(cat.canonical_track_key)) = upper(trim(ctd.track_id))
      )
    ),
    candidates AS (
      SELECT
        m.*,
        cat.id AS cat_id,
        cat.album_id,
        cat.position,
        cat.title AS slot_title,
        al.title AS album_title,
        al.release_year,
        aek.external_key AS rval,
        coalesce(al.canonical_cover_path, aal.canonical_cover_path, aal.r2_cover_key) AS cover_source,
        count(*) OVER (PARTITION BY m.rvtr) AS candidate_count
      FROM missing m
      JOIN albums al ON al.artist_id::text = m.canonical_artist_id
      JOIN canonical_album_tracks cat
        ON cat.album_id = al.id
       AND (cat.canonical_track_key IS NULL OR trim(cat.canonical_track_key) = '')
      LEFT JOIN LATERAL (
        SELECT external_key
        FROM album_external_keys aek
        WHERE aek.album_id = al.id AND aek.external_key ~* '^RVAL[0-9]{6}$'
        ORDER BY external_key
        LIMIT 1
      ) aek ON true
      LEFT JOIN LATERAL (
        SELECT canonical_cover_path, r2_cover_key
        FROM album_artwork_links aal
        WHERE aal.album_id = al.id
        ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC,
                 aal.confidence_score DESC NULLS LAST,
                 aal.updated_at DESC NULLS LAST,
                 aal.id DESC
        LIMIT 1
      ) aal ON true
      WHERE lower(regexp_replace(trim(cat.title), '[^a-z0-9]+', '', 'g')) =
            lower(regexp_replace(trim(m.title), '[^a-z0-9]+', '', 'g'))
    ),
    queue AS (
      SELECT *
      FROM candidates
      WHERE candidate_count = 1
      ORDER BY
        CASE
          WHEN album_title ~* '(greatest|best of|essential|collection|anthology|hits|live|storytellers)' THEN 1
          ELSE 0
        END,
        rvtr
      LIMIT $1
    )
    SELECT
      q.rvtr,
      q.title,
      q.artist_name,
      q.canonical_artist_id,
      q.graph_track_id,
      q.first_chart_date,
      q.peak_hot100_position,
      q.chart_weeks,
      COALESCE(existing.links, '[]'::json) AS existing_album_links,
      q.album_id::text AS proposed_album_id,
      q.album_title AS proposed_album_title,
      q.rval AS proposed_rval,
      q.release_year AS proposed_release_year,
      q.position AS proposed_position,
      q.slot_title AS proposed_slot_title,
      q.cover_source,
      COALESCE(competing.candidates, '[]'::json) AS competing_candidates,
      COALESCE(media.items, '[]'::json) AS media_evidence
    FROM queue q
    LEFT JOIN LATERAL (
      SELECT json_agg(json_build_object(
        'albumId', al.id::text,
        'albumTitle', al.title,
        'rval', aek.external_key,
        'position', cat.position,
        'coverSource', coalesce(al.canonical_cover_path, aal.canonical_cover_path, aal.r2_cover_key)
      ) ORDER BY cat.position, al.release_year NULLS LAST) AS links
      FROM canonical_album_tracks cat
      JOIN albums al ON al.id = cat.album_id
      LEFT JOIN LATERAL (
        SELECT external_key FROM album_external_keys aek
        WHERE aek.album_id = al.id AND aek.external_key ~* '^RVAL[0-9]{6}$'
        ORDER BY external_key LIMIT 1
      ) aek ON true
      LEFT JOIN LATERAL (
        SELECT canonical_cover_path, r2_cover_key FROM album_artwork_links aal
        WHERE aal.album_id = al.id
        ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC,
                 aal.confidence_score DESC NULLS LAST,
                 aal.updated_at DESC NULLS LAST,
                 aal.id DESC LIMIT 1
      ) aal ON true
      WHERE upper(trim(cat.canonical_track_key)) = q.rvtr
    ) existing ON true
    LEFT JOIN LATERAL (
      SELECT json_agg(json_build_object(
        'albumId', al.id::text,
        'albumTitle', al.title,
        'rval', aek.external_key,
        'releaseYear', al.release_year,
        'position', cat.position,
        'slotTitle', cat.title
      ) ORDER BY al.release_year NULLS LAST, al.title) AS candidates
      FROM albums al
      JOIN canonical_album_tracks cat
        ON cat.album_id = al.id
       AND (cat.canonical_track_key IS NULL OR trim(cat.canonical_track_key) = '')
      LEFT JOIN LATERAL (
        SELECT external_key FROM album_external_keys aek
        WHERE aek.album_id = al.id AND aek.external_key ~* '^RVAL[0-9]{6}$'
        ORDER BY external_key LIMIT 1
      ) aek ON true
      WHERE al.artist_id::text = q.canonical_artist_id
        AND lower(regexp_replace(trim(cat.title), '[^a-z0-9]+', '', 'g')) =
            lower(regexp_replace(trim(q.title), '[^a-z0-9]+', '', 'g'))
    ) competing ON true
    LEFT JOIN LATERAL (
      SELECT json_agg(json_build_object(
        'sourcePath', ma.source_path,
        'artistText', ma.artist_text,
        'titleText', ma.title_text,
        'albumText', ma.album_text,
        'durationSeconds', ma.duration_seconds,
        'confidenceScore', mtl.confidence_score
      ) ORDER BY mtl.confidence_score DESC NULLS LAST, ma.updated_at DESC NULLS LAST) AS items
      FROM (
        SELECT mtl.media_asset_id, mtl.confidence_score
        FROM media_track_links mtl
        WHERE q.graph_track_id IS NOT NULL
          AND mtl.track_id = q.graph_track_id::bigint
        ORDER BY mtl.confidence_score DESC NULLS LAST, mtl.id DESC
        LIMIT 4
      ) mtl
      JOIN media_assets ma ON ma.id = mtl.media_asset_id
    ) media ON true
    ORDER BY q.rvtr
    `,
    [limit],
  );

  const items: AlbumReviewQueueItem[] = rows.map((row) => {
    const existingAlbumLinks = parseArray<AlbumReviewQueueItem["existingAlbumLinks"][number]>(row.existing_album_links);
    const competingCandidates = parseArray<AlbumReviewQueueItem["competingCandidates"][number]>(row.competing_candidates);
    const mediaEvidence = parseArray<AlbumReviewQueueItem["mediaEvidence"][number]>(row.media_evidence);
    const warningInput = {
      proposed_album_title: row.proposed_album_title,
      proposed_release_year: row.proposed_release_year,
      first_chart_date: row.first_chart_date,
      competing_candidates: competingCandidates,
      existing_album_links: existingAlbumLinks,
      media_evidence: mediaEvidence,
    };
    const warnings = warningsForAlbumReview(warningInput);
    const albumType = albumTypeForTitle(row.proposed_album_title);
    return {
      rvtr: row.rvtr,
      title: row.title,
      artistName: row.artist_name,
      canonicalArtistId: row.canonical_artist_id,
      graphTrackId: row.graph_track_id,
      firstChartDate: row.first_chart_date,
      peakHot100Position: row.peak_hot100_position,
      chartWeeks: row.chart_weeks,
      existingAlbumLinks,
      proposedAlbumId: row.proposed_album_id,
      proposedAlbumTitle: row.proposed_album_title,
      proposedRval: row.proposed_rval,
      proposedReleaseYear: row.proposed_release_year,
      proposedPosition: row.proposed_position,
      proposedSlotTitle: row.proposed_slot_title,
      albumType,
      coverSource: row.cover_source,
      competingCandidates,
      mediaEvidence,
      warnings,
      confidence: warnings.length === 0 && albumType === "studio_candidate" ? 0.95 : 0.8,
      publicLinks: [
        { label: "Song", href: `/retroverse-2/song/${row.rvtr}` },
        { label: "Artist", href: row.artist_name ? `/artist/${row.artist_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "")}` : null },
        { label: "Album", href: row.proposed_rval ? `/album/${row.proposed_rval}` : null },
        { label: "Year", href: row.first_chart_date ? `/rv/${row.first_chart_date.slice(0, 4)}` : null },
      ],
    };
  });

  const bobReview = items.filter((item) => item.warnings.length > 0 || item.albumType !== "studio_candidate").length;
  const promotedReadOnly = items.filter((item) => item.warnings.length === 0 && item.albumType === "studio_candidate").length;
  return {
    generatedAt: new Date().toISOString(),
    total: items.length,
    promotedReadOnly,
    bobReview,
    unresolved: bobReview,
    items,
  };
}

async function loadAlbumReviewQueueFromArtifact(limit: number): Promise<AlbumReviewQueueData | null> {
  try {
    let dir = path.join(process.cwd(), "reports/data-repair");
    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      dir = path.join(process.cwd(), "../../reports/data-repair");
      files = await readdir(dir);
    }
    const reviewFiles = files
      .filter((file) => /^canonical-album-relationship-95-dry-run-.*\.json$/.test(file))
      .sort();
    const latest = reviewFiles.at(-1);
    if (!latest) return null;
    const raw = JSON.parse(await readFile(path.join(dir, latest), "utf8")) as {
      generated_at?: string;
      rows?: Array<{
        rvtr: string;
        song_title: string;
        artist: string;
        proposed_primary_album: string | null;
        album_id: string | null;
        rval: string | null;
        position: number | null;
        slot_title: string | null;
        evidence: string;
        conflict_flags: string;
        bucket: string;
        final_confidence: number;
        write_recommendation: string;
      }>;
    };
    const sourceRows = (raw.rows ?? [])
      .filter((row) => row.write_recommendation !== "promote_to_100")
      .slice(0, limit);
    const items: AlbumReviewQueueItem[] = sourceRows.map((row) => {
      const warnings = row.conflict_flags
        ? row.conflict_flags.split(";").map((warning) => warning.trim()).filter(Boolean)
        : row.bucket === "A_original_studio_album_clearly_identifiable" ? [] : [row.bucket];
      const albumType = albumTypeForTitle(row.proposed_primary_album);
      return {
        rvtr: row.rvtr,
        title: row.song_title,
        artistName: row.artist,
        canonicalArtistId: null,
        graphTrackId: null,
        firstChartDate: null,
        peakHot100Position: null,
        chartWeeks: 0,
        existingAlbumLinks: [],
        proposedAlbumId: row.album_id,
        proposedAlbumTitle: row.proposed_primary_album,
        proposedRval: row.rval,
        proposedReleaseYear: null,
        proposedPosition: row.position,
        proposedSlotTitle: row.slot_title,
        albumType,
        coverSource: null,
        competingCandidates: row.album_id ? [{
          albumId: row.album_id,
          albumTitle: row.proposed_primary_album ?? "Unknown album",
          rval: row.rval,
          releaseYear: null,
          position: row.position,
          slotTitle: row.slot_title,
        }] : [],
        mediaEvidence: [],
        warnings,
        confidence: row.final_confidence,
        publicLinks: [
          { label: "Song", href: `/retroverse-2/song/${row.rvtr}` },
          { label: "Artist", href: row.artist ? `/artist/${row.artist.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "")}` : null },
          { label: "Album", href: row.rval ? `/album/${row.rval}` : null },
          { label: "Year", href: null },
        ],
      };
    });
    return {
      generatedAt: raw.generated_at ?? new Date().toISOString(),
      total: items.length,
      promotedReadOnly: items.filter((item) => item.warnings.length === 0 && item.albumType === "studio_candidate").length,
      bobReview: items.length,
      unresolved: items.length,
      items,
    };
  } catch {
    return null;
  }
}

export async function loadIntegrityDashboard(options?: {
  query?: string;
  traceRvtr?: string;
  queue?: string;
}): Promise<IntegrityDashboardData> {
  const generatedAt = new Date().toISOString();
  const searchQuery = options?.query?.trim() ?? "";
  const traceRvtr = options?.traceRvtr?.trim().toUpperCase() || DEFAULT_RVTR;
  const ping = await inspectPing();
  if (!ping.ok) {
    return {
      ok: false,
      error: ping.error ?? "Database unavailable",
      generatedAt,
      cards: [],
      priorityCards: [],
      albumReviewQueue: null,
      searchQuery,
      searchResults: [],
      trace: null,
      totalOpenIssues: 0,
      cockpitStatus: "Healthy",
    };
  }

  const cardLoaders = [
    () => card(
      "duplicate-artists",
      "Duplicate Artists",
      "Artist rows that collapse to the same punctuation-free key.",
      `SELECT count(*)::int FROM (
        SELECT lower(regexp_replace(regexp_replace(trim(canonical_name), '^the\\s+', '', 'i'), '[^a-z0-9]+', '', 'g')) k
        FROM artists GROUP BY 1 HAVING count(*) > 1
      ) x`,
      `SELECT min(id)::text AS id, min(canonical_name) AS label, count(*)::text || ' artist rows share this normalized key' AS detail
       FROM artists
       GROUP BY lower(regexp_replace(regexp_replace(trim(canonical_name), '^the\\s+', '', 'i'), '[^a-z0-9]+', '', 'g'))
       HAVING count(*) > 1
       ORDER BY count(*) DESC, label LIMIT $1`,
    ),
    () => card(
      "duplicate-albums",
      "Duplicate Albums",
      "Album rows with the same normalized artist, title, and release year.",
      `SELECT count(*)::int FROM (
        SELECT ar.id, lower(regexp_replace(trim(al.title), '[^a-z0-9]+', '', 'g')) k, al.release_year
        FROM albums al JOIN artists ar ON ar.id = al.artist_id
        GROUP BY 1, 2, 3 HAVING count(*) > 1
      ) x`,
      `SELECT min(al.id)::text AS id, min(ar.canonical_name || ' — ' || al.title) AS label, count(*)::text || ' album rows share artist/title/year' AS detail
       FROM albums al JOIN artists ar ON ar.id = al.artist_id
       GROUP BY ar.id, lower(regexp_replace(trim(al.title), '[^a-z0-9]+', '', 'g')), al.release_year
       HAVING count(*) > 1
       ORDER BY count(*) DESC, label LIMIT $1`,
    ),
    () => card(
      "duplicate-tracks",
      "Duplicate Tracks",
      "RVTR display rows with the same normalized artist and title.",
      `SELECT count(*)::int FROM (
        SELECT lower(regexp_replace(trim(canonical_artist_name), '[^a-z0-9]+', '', 'g')) a,
               lower(regexp_replace(trim(canonical_title), '[^a-z0-9]+', '', 'g')) t
        FROM canonical_track_display GROUP BY 1, 2 HAVING count(*) > 1
      ) x`,
      `SELECT min(track_id) AS id, min(canonical_artist_name || ' — ' || canonical_title) AS label,
              count(*)::text || ' RVTR display rows share artist/title' AS detail,
              '/retroverse-2/song/' || min(track_id) AS href
       FROM canonical_track_display
       GROUP BY lower(regexp_replace(trim(canonical_artist_name), '[^a-z0-9]+', '', 'g')),
                lower(regexp_replace(trim(canonical_title), '[^a-z0-9]+', '', 'g'))
       HAVING count(*) > 1
       ORDER BY count(*) DESC, label LIMIT $1`,
    ),
    () => card(
      "broken-artist-links",
      "Broken Artist Links",
      "Track display artist names that do not resolve to an artist row by active name logic.",
      `SELECT count(*)::int FROM (
        SELECT DISTINCT ctd.canonical_artist_name
        FROM canonical_track_display ctd
        LEFT JOIN artists ar ON lower(regexp_replace(trim(ar.canonical_name), '^the\\s+', '', 'i')) =
          lower(regexp_replace(trim(ctd.canonical_artist_name), '^the\\s+', '', 'i'))
        WHERE ar.id IS NULL
      ) x`,
      `SELECT min(ctd.track_id) AS id, ctd.canonical_artist_name AS label,
              'No artists.canonical_name match for display artist' AS detail,
              '/retroverse-2/song/' || min(ctd.track_id) AS href
       FROM canonical_track_display ctd
       LEFT JOIN artists ar ON lower(regexp_replace(trim(ar.canonical_name), '^the\\s+', '', 'i')) =
          lower(regexp_replace(trim(ctd.canonical_artist_name), '^the\\s+', '', 'i'))
       WHERE ar.id IS NULL
       GROUP BY ctd.canonical_artist_name ORDER BY label LIMIT $1`,
    ),
    () => card(
      "broken-album-links",
      "Broken Album Links",
      "Album track rows whose RVTR key has no canonical track display row.",
      `WITH album_keys AS (
         SELECT DISTINCT upper(trim(canonical_track_key)) AS rvtr
         FROM canonical_album_tracks
         WHERE nullif(trim(canonical_track_key), '') IS NOT NULL
       ),
       display_keys AS (
         SELECT DISTINCT upper(trim(track_id)) AS rvtr FROM canonical_track_display
       )
       SELECT count(*)::int
       FROM album_keys ak
       LEFT JOIN display_keys dk ON dk.rvtr = ak.rvtr
       WHERE dk.rvtr IS NULL`,
      `WITH album_keys AS (
         SELECT upper(trim(canonical_track_key)) AS rvtr, min(title) AS title, max(id) AS sort_id
         FROM canonical_album_tracks
         WHERE nullif(trim(canonical_track_key), '') IS NOT NULL
         GROUP BY upper(trim(canonical_track_key))
       ),
       display_keys AS (
         SELECT DISTINCT upper(trim(track_id)) AS rvtr FROM canonical_track_display
       )
       SELECT ak.rvtr AS id, ak.title AS label, 'Album sequence points at missing RVTR' AS detail
       FROM album_keys ak
       LEFT JOIN display_keys dk ON dk.rvtr = ak.rvtr
       WHERE dk.rvtr IS NULL
       ORDER BY ak.sort_id DESC LIMIT $1`,
    ),
    () => card(
      "alias-conflicts",
      "Alias Conflicts",
      "Search labels whose normalized form points at multiple entity targets.",
      `SELECT count(*)::int FROM (
        SELECT normalized_label FROM search_entities
        GROUP BY normalized_label
        HAVING count(DISTINCT entity_type || ':' || coalesce(rv_id, slug, label)) > 1
      ) x`,
      `SELECT normalized_label AS id, min(label) AS label,
              count(DISTINCT entity_type || ':' || coalesce(rv_id, slug, label))::text || ' search targets share this normalized label' AS detail
       FROM search_entities GROUP BY normalized_label
       HAVING count(DISTINCT entity_type || ':' || coalesce(rv_id, slug, label)) > 1
       ORDER BY count(DISTINCT entity_type || ':' || coalesce(rv_id, slug, label)) DESC, label LIMIT $1`,
    ),
    () => card(
      "missing-covers",
      "Missing Covers",
      "RVAL-backed albums without a cover path or artwork link.",
      `SELECT count(*)::int FROM albums al
       JOIN album_external_keys aek ON aek.album_id = al.id AND aek.external_key ~* '^RVAL[0-9]{6}$'
       WHERE al.canonical_cover_path IS NULL
         AND NOT EXISTS (SELECT 1 FROM album_artwork_links aal WHERE aal.album_id = al.id AND (aal.canonical_cover_path IS NOT NULL OR aal.r2_cover_key IS NOT NULL))`,
      `SELECT upper(trim(aek.external_key)) AS id, al.title AS label,
              'No canonical cover path or accepted artwork link' AS detail,
              '/album/' || upper(trim(aek.external_key)) AS href
       FROM albums al
       JOIN album_external_keys aek ON aek.album_id = al.id AND aek.external_key ~* '^RVAL[0-9]{6}$'
       WHERE al.canonical_cover_path IS NULL
         AND NOT EXISTS (SELECT 1 FROM album_artwork_links aal WHERE aal.album_id = al.id AND (aal.canonical_cover_path IS NOT NULL OR aal.r2_cover_key IS NOT NULL))
       ORDER BY al.release_year DESC NULLS LAST LIMIT $1`,
    ),
    () => card(
      "orphan-tracks",
      "Orphan Tracks",
      "Canonical track rows that are not connected to canonical track display.",
      `SELECT count(*)::int
       FROM canonical_tracks ct
       LEFT JOIN canonical_track_display ctd ON ctd.id = ct.id
       WHERE ctd.id IS NULL`,
      `SELECT coalesce(ct.track_id, ct.retroverse_track_id, ct.id::text) AS id,
              coalesce(ct.track_id, ct.retroverse_track_id, ct.id::text) AS label,
              'canonical_tracks row has no canonical_track_display row' AS detail
       FROM canonical_tracks ct
       LEFT JOIN canonical_track_display ctd ON ctd.id = ct.id
       WHERE ctd.id IS NULL
       ORDER BY ct.id DESC LIMIT $1`,
    ),
    () => card(
      "multiple-canonical-candidates",
      "Multiple Canonical Candidates",
      "Artist/title groups containing more than one Hot 100 RVTR candidate.",
      `SELECT count(*)::int FROM (
        SELECT lower(regexp_replace(trim(canonical_artist_name), '[^a-z0-9]+', '', 'g')) a,
               lower(regexp_replace(trim(canonical_title), '[^a-z0-9]+', '', 'g')) t
        FROM canonical_track_display WHERE has_hot100 = true
        GROUP BY 1, 2 HAVING count(*) > 1
      ) x`,
      `SELECT min(track_id) AS id, min(canonical_artist_name || ' — ' || canonical_title) AS label,
              count(*)::text || ' Hot 100 canonical candidates' AS detail,
              '/retroverse-2/song/' || min(track_id) AS href
       FROM canonical_track_display WHERE has_hot100 = true
       GROUP BY lower(regexp_replace(trim(canonical_artist_name), '[^a-z0-9]+', '', 'g')),
                lower(regexp_replace(trim(canonical_title), '[^a-z0-9]+', '', 'g'))
       HAVING count(*) > 1
       ORDER BY count(*) DESC, label LIMIT $1`,
    ),
    () => card(
      "unresolved-routes",
      "Unresolved Routes",
      "Canonical tracks missing direct fields required by public routes.",
      `SELECT count(*)::int
       FROM canonical_track_display ctd
       WHERE nullif(trim(ctd.canonical_artist_name), '') IS NULL
          OR nullif(trim(ctd.canonical_title), '') IS NULL
          OR (ctd.has_hot100 = true AND ctd.first_chart_date IS NULL)`,
      `SELECT ctd.track_id AS id, coalesce(ctd.canonical_artist_name, 'Unknown artist') || ' — ' || coalesce(ctd.canonical_title, 'Unknown title') AS label,
              CASE
                WHEN nullif(trim(ctd.canonical_artist_name), '') IS NULL THEN 'Missing artist display field for artist route'
                WHEN nullif(trim(ctd.canonical_title), '') IS NULL THEN 'Missing title display field for song/search route'
                ELSE 'Missing first chart date for year route'
              END AS detail,
              '/retroverse-2/song/' || ctd.track_id AS href
       FROM canonical_track_display ctd
       WHERE nullif(trim(ctd.canonical_artist_name), '') IS NULL
          OR nullif(trim(ctd.canonical_title), '') IS NULL
          OR (ctd.has_hot100 = true AND ctd.first_chart_date IS NULL)
       ORDER BY ctd.track_id LIMIT $1`,
    ),
  ];

  const allCards: IntegrityCard[] = [];
  for (const loadCard of cardLoaders) {
    allCards.push(await loadCard());
  }

  const cards = allCards.filter((card) => ACTIVE_CARD_IDS.has(card.id));
  const priorityCards = cards
    .filter((card) => card.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const totalOpenIssues = cards.reduce((sum, card) => sum + card.count, 0);
  const searchResults = await searchIntegrityRecords(searchQuery);
  const albumReviewQueue =
    options?.queue === "album-review" ? await loadAlbumReviewQueue() : null;

  return {
    ok: true,
    generatedAt,
    cards,
    priorityCards,
    albumReviewQueue,
    searchQuery,
    searchResults,
    trace: await loadIntegrityTrace(traceRvtr),
    totalOpenIssues,
    cockpitStatus: cockpitStatusForIssues(totalOpenIssues),
  };
}
