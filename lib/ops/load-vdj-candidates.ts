import { inspectQuery } from "@/lib/inspect/pg";
import {
  isOpsPlayableVideoPath,
  opsVideoMediaAndClause,
} from "@/lib/ops/ops-video-media";
import { parseVdjMetadataYear } from "@/lib/ops/year-authority";

export type VdjCandidate = {
  mediaId: number;
  artist: string;
  title: string;
  localPath: string;
  filename: string | null;
  /** VDJ advisory metadata year — never used for chart grouping. */
  vdjYear: number | null;
  confidence: number | null;
  hasR2: boolean;
  source: "link" | "fuzzy";
};

type CandidateRow = {
  id: number;
  artist_text: string | null;
  title_text: string | null;
  year_text: string | null;
  source_path: string | null;
  filename: string | null;
  confidence_score: number | null;
  r2_media_key: string | null;
  source: string;
};

const VIDEO_FILTER = opsVideoMediaAndClause("ma");

function mapRow(row: CandidateRow): VdjCandidate {
  const path = row.source_path?.trim() || row.filename?.trim() || "—";
  return {
    mediaId: row.id,
    artist: row.artist_text?.trim() || "—",
    title: row.title_text?.trim() || row.filename?.trim() || "—",
    localPath: path,
    filename: row.filename,
    vdjYear: parseVdjMetadataYear(row.year_text, row.source_path),
    confidence: row.confidence_score,
    hasR2: Boolean(row.r2_media_key?.trim()),
    source: row.source === "link" ? "link" : "fuzzy",
  };
}

function keepVideoCandidate(row: CandidateRow): boolean {
  return isOpsPlayableVideoPath(row.source_path || row.filename);
}

export async function loadVdjCandidates(input: {
  graphTrackId: number;
  artist: string;
  title: string;
}): Promise<VdjCandidate[]> {
  const linked = await inspectQuery<CandidateRow>(
    `
    SELECT
      ma.id,
      ma.artist_text,
      ma.title_text,
      ma.year_text,
      ma.source_path,
      ma.filename,
      mtl.confidence_score,
      ma.r2_media_key,
      'link' AS source
    FROM media_track_links mtl
    JOIN media_assets ma ON ma.id = mtl.media_asset_id
    WHERE mtl.track_id = $1
    ${VIDEO_FILTER}
    ORDER BY mtl.confidence_score DESC NULLS LAST, ma.updated_at DESC NULLS LAST
    LIMIT 20
    `,
    [input.graphTrackId],
  );

  const seen = new Set<number>();
  const out: VdjCandidate[] = [];

  for (const row of linked) {
    if (!keepVideoCandidate(row)) continue;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(mapRow(row));
  }

  if (out.length < 8) {
    const fuzzy = await inspectQuery<CandidateRow>(
      `
      SELECT
        ma.id,
        ma.artist_text,
        ma.title_text,
        ma.year_text,
        ma.source_path,
        ma.filename,
        NULL::int AS confidence_score,
        ma.r2_media_key,
        'fuzzy' AS source
      FROM media_assets ma
      WHERE ma.source_path IS NOT NULL
        AND (
          lower(coalesce(ma.artist_text, '')) LIKE '%' || lower($1) || '%'
          OR lower(coalesce(ma.title_text, '')) LIKE '%' || lower($2) || '%'
        )
      ${VIDEO_FILTER}
      ORDER BY ma.updated_at DESC NULLS LAST
      LIMIT 15
      `,
      [input.artist.slice(0, 40), input.title.slice(0, 40)],
    );

    for (const row of fuzzy) {
      if (!keepVideoCandidate(row)) continue;
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push(mapRow(row));
      if (out.length >= 25) break;
    }
  }

  return out;
}
