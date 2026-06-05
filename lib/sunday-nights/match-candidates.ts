import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

export type MatchCandidate = {
  rvtr: string;
  title: string;
  artistName: string;
  peakHot100: number | null;
};

type DisplayRow = {
  rvtr: string | null;
  canonical_title: string;
  canonical_artist_name: string;
  peak_hot100_position: number | null;
};

function cleanTitle(title: string): string {
  return title
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s*\[[^\]]*\]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function loadMatchCandidates(
  artist: string,
  title: string,
  limit = 8,
): Promise<MatchCandidate[]> {
  const ping = await inspectPing();
  if (!ping.ok) return [];

  const artistNeedle = artist.trim();
  const titleNeedle = title.trim();
  const titleCore = cleanTitle(titleNeedle);
  if (!artistNeedle || !titleNeedle) return [];

  const rows = await inspectQuery<DisplayRow>(
    `
    SELECT
      upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) AS rvtr,
      ctd.canonical_title,
      ctd.canonical_artist_name,
      ctd.peak_hot100_position
    FROM canonical_track_display ctd
    WHERE ctd.canonical_artist_name ILIKE $1
      AND (
        ctd.canonical_title ILIKE $2
        OR ctd.canonical_title ILIKE $3
        OR ctd.canonical_title ILIKE $4
      )
    ORDER BY
      ctd.has_hot100 DESC,
      ctd.peak_hot100_position ASC NULLS LAST,
      ctd.chart_weeks DESC,
      ctd.canonical_title ASC
    LIMIT $5
    `,
    [
      `%${artistNeedle}%`,
      titleNeedle,
      `%${titleCore}%`,
      `%${titleNeedle}%`,
      limit,
    ],
  );

  const seen = new Set<string>();
  const out: MatchCandidate[] = [];
  for (const row of rows) {
    const rvtr = row.rvtr?.trim().toUpperCase();
    if (!rvtr || seen.has(rvtr)) continue;
    seen.add(rvtr);
    out.push({
      rvtr,
      title: row.canonical_title.trim(),
      artistName: row.canonical_artist_name.trim(),
      peakHot100: row.peak_hot100_position,
    });
  }
  return out;
}
