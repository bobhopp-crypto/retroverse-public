import { ensureUniqueRowIds } from "@/lib/ops/ensure-unique-ids";
import { inspectQuery } from "@/lib/inspect/pg";
import type { OpsQueueMetadataIssueRow } from "@/lib/ops/types";

const PER_DETECTOR = 20;

function pushIssue(
  out: OpsQueueMetadataIssueRow[],
  row: Omit<OpsQueueMetadataIssueRow, "id"> & { id: string },
) {
  if (out.length >= 60) return;
  const baseId = row.id.trim() || `meta-${out.length + 1}`;
  let id = baseId;
  let suffix = 0;
  while (out.some((r) => r.id === id)) {
    suffix += 1;
    id = `${baseId}--${suffix}`;
  }
  out.push({
    id,
    issueType: row.issueType,
    entity: row.entity,
    details: row.details,
    confidence: row.confidence,
    suggestedAction: row.suggestedAction,
  });
}

export async function loadMetadataIssuesQueue(): Promise<OpsQueueMetadataIssueRow[]> {
  const issues: OpsQueueMetadataIssueRow[] = [];

  const [
    duplicateArtists,
    missingAlbumYears,
    missingTrackYears,
    blankMedia,
    malformedTitles,
    unlinkedMedia,
    suspiciousTitles,
  ] = await Promise.all([
    inspectQuery<{ norm: string; artist_ids: string; names: string }>(
      `
      SELECT
        lower(trim(canonical_artist_name)) AS norm,
        string_agg(DISTINCT artist_id::text, ', ') AS artist_ids,
        string_agg(DISTINCT canonical_artist_name, ' | ') AS names
      FROM canonical_track_display
      WHERE trim(coalesce(canonical_artist_name, '')) <> ''
      GROUP BY 1
      HAVING count(DISTINCT artist_id) > 1
      ORDER BY count(DISTINCT artist_id) DESC
      LIMIT $1
      `,
      [PER_DETECTOR],
    ),
    inspectQuery<{
      pg_album_id: number;
      rval: string | null;
      title: string;
      artist_name: string;
      b200_peak: number | null;
    }>(
      `
      SELECT al.id AS pg_album_id, aek.external_key AS rval, al.title, ar.canonical_name AS artist_name, chart.b200_peak
      FROM albums al
      JOIN artists ar ON ar.id = al.artist_id
      LEFT JOIN album_external_keys aek ON aek.album_id = al.id
      LEFT JOIN LATERAL (
        SELECT min(ca.chart_position) AS b200_peak
        FROM chart_appearances ca
        WHERE ca.album_id = al.id AND ca.chart_name = 'Billboard 200'
      ) chart ON true
      WHERE al.release_year IS NULL
      ORDER BY chart.b200_peak ASC NULLS LAST, al.title
      LIMIT $1
      `,
      [PER_DETECTOR],
    ),
    inspectQuery<{ track_id: string; canonical_title: string; canonical_artist_name: string }>(
      `
      SELECT track_id, canonical_title, canonical_artist_name
      FROM canonical_track_display
      WHERE has_hot100 = true
        AND first_chart_date IS NULL
      ORDER BY peak_hot100_position ASC NULLS LAST, canonical_title
      LIMIT $1
      `,
      [PER_DETECTOR],
    ),
    inspectQuery<{ id: number; artist_text: string | null; title_text: string | null; source_path: string | null }>(
      `
      SELECT id, artist_text, title_text, source_path
      FROM media_assets
      WHERE trim(coalesce(artist_text, '')) = ''
         OR trim(coalesce(title_text, '')) = ''
      ORDER BY updated_at DESC NULLS LAST
      LIMIT $1
      `,
      [PER_DETECTOR],
    ),
    inspectQuery<{ track_id: string; canonical_title: string; canonical_artist_name: string }>(
      `
      SELECT track_id, canonical_title, canonical_artist_name
      FROM canonical_track_display
      WHERE canonical_title ~ '\\s{2,}'
         OR canonical_title ~ '^\\s|\\s$'
      ORDER BY chart_weeks DESC NULLS LAST, canonical_title
      LIMIT $1
      `,
      [PER_DETECTOR],
    ),
    inspectQuery<{ id: number; artist_text: string | null; title_text: string | null; source_path: string | null }>(
      `
      SELECT ma.id, ma.artist_text, ma.title_text, ma.source_path
      FROM media_assets ma
      WHERE NOT EXISTS (
        SELECT 1 FROM media_track_links mtl WHERE mtl.media_asset_id = ma.id
      )
      ORDER BY ma.updated_at DESC NULLS LAST
      LIMIT $1
      `,
      [PER_DETECTOR],
    ),
    inspectQuery<{ track_id: string; canonical_title: string; canonical_artist_name: string }>(
      `
      SELECT track_id, canonical_title, canonical_artist_name
      FROM canonical_track_display
      WHERE lower(trim(canonical_title)) IN ('unknown', 'untitled', 'tbd', '?')
         OR canonical_title = '?'
      ORDER BY has_hot100 DESC, peak_hot100_position ASC NULLS LAST
      LIMIT $1
      `,
      [PER_DETECTOR],
    ),
  ]);

  for (const row of duplicateArtists) {
    pushIssue(issues, {
      id: `meta-dup-${row.norm}`,
      issueType: "duplicate_artist",
      entity: `${row.names} (artist_ids: ${row.artist_ids})`,
      details: `Normalized name "${row.norm}" maps to multiple artist_id values in canonical_track_display.`,
      confidence: "high",
      suggestedAction: "merge later",
    });
  }

  for (const row of missingAlbumYears) {
    const rval = row.rval?.trim().toUpperCase();
    pushIssue(issues, {
      id: `meta-aly-${row.pg_album_id}`,
      issueType: "missing_year",
      entity: `${rval || "album"} · ${row.title} — ${row.artist_name}`,
      details:
        row.b200_peak != null
          ? `release_year is null; Billboard 200 peak #${row.b200_peak}.`
          : "release_year is null on albums row.",
      confidence: row.b200_peak != null && row.b200_peak <= 40 ? "high" : "medium",
      suggestedAction: "resolve",
    });
  }

  for (const row of missingTrackYears) {
    pushIssue(issues, {
      id: `meta-trk-${row.track_id}`,
      issueType: "missing_year",
      entity: `${row.track_id} · ${row.canonical_title}`,
      details: `Hot 100 track missing first_chart_date (${row.canonical_artist_name}).`,
      confidence: "medium",
      suggestedAction: "resolve",
    });
  }

  for (const row of blankMedia) {
    pushIssue(issues, {
      id: `meta-media-blank-${row.id}`,
      issueType: "suspicious_data",
      entity: `media_asset #${row.id}`,
      details: `Blank artist/title on media_assets (${row.source_path || "no path"}).`,
      confidence: "high",
      suggestedAction: "resolve",
    });
  }

  for (const row of malformedTitles) {
    pushIssue(issues, {
      id: `meta-mal-${row.track_id}`,
      issueType: "malformed_title",
      entity: `${row.track_id} · '${row.canonical_title}'`,
      details: "Title has extra whitespace or edge spaces.",
      confidence: "low",
      suggestedAction: "resolve",
    });
  }

  for (const row of unlinkedMedia) {
    pushIssue(issues, {
      id: `meta-unlink-${row.id}`,
      issueType: "missing_song_id",
      entity: `media_asset #${row.id} · ${row.artist_text || "?"} — ${row.title_text || "?"}`,
      details: `No media_track_links row (${row.source_path || "path unknown"}).`,
      confidence: "medium",
      suggestedAction: "resolve",
    });
  }

  for (const row of suspiciousTitles) {
    pushIssue(issues, {
      id: `meta-susp-${row.track_id}`,
      issueType: "suspicious_data",
      entity: `${row.track_id} · '${row.canonical_title}'`,
      details: `Placeholder-like canonical title (${row.canonical_artist_name}).`,
      confidence: "medium",
      suggestedAction: "ignore",
    });
  }

  return ensureUniqueRowIds(issues.slice(0, 60));
}
