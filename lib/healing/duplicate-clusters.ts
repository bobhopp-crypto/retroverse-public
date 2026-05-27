import { inspectQuery } from "@/lib/inspect/pg";
import { healingClusterKey, normalizeArtistKey } from "@/lib/healing/normalize-keys";
import { normalizeTrackTitleKey } from "@/lib/track/album-link-recovery/normalize-title";

export type DuplicateClusterMember = {
  rvtr: string;
  title: string;
  artistName: string;
  chartWeeks: number;
  peakHot100: number | null;
  releaseYear: number | null;
  albumLinkCount: number;
};

export type DuplicateClusterSummary = {
  clusterId: string;
  titleKey: string;
  artistKey: string;
  displayTitle: string;
  displayArtist: string;
  clusterSize: number;
  probableCanonicalRvtr: string;
  probableCanonicalLabel: string;
  duplicateConfidence: number;
  memberRvtrs: string[];
  members: DuplicateClusterMember[];
  signals: string[];
};

type MemberRow = {
  track_id: string;
  canonical_title: string;
  canonical_artist_name: string;
  chart_weeks: number;
  peak_hot100_position: number | null;
  first_chart_date: string | null;
  album_link_count: number;
  title_key: string;
  artist_key: string;
};

function yearFromDate(value: string | null): number | null {
  if (!value?.trim()) return null;
  const y = Number(value.slice(0, 4));
  return Number.isFinite(y) && y > 0 ? y : null;
}

function pickProbableCanonical(members: DuplicateClusterMember[]): DuplicateClusterMember {
  return [...members].sort(
    (a, b) =>
      b.chartWeeks - a.chartWeeks ||
      (a.peakHot100 ?? 999) - (b.peakHot100 ?? 999) ||
      b.albumLinkCount - a.albumLinkCount,
  )[0]!;
}

async function loadSharedAlbumOverlapByCluster(
  clusters: Map<string, DuplicateClusterMember[]>,
): Promise<Map<string, number>> {
  const allRvtrs = [...new Set([...clusters.values()].flatMap((m) => m.map((x) => x.rvtr)))];
  if (allRvtrs.length < 2) return new Map();

  const rows = await inspectQuery<{ album_id: number; rvtrs: string[] }>(
    `
    SELECT cat.album_id, array_agg(DISTINCT upper(trim(cat.canonical_track_key))) AS rvtrs
    FROM canonical_album_tracks cat
    WHERE upper(trim(cat.canonical_track_key)) = ANY($1::text[])
    GROUP BY cat.album_id
    HAVING count(DISTINCT upper(trim(cat.canonical_track_key))) > 1
    `,
    [allRvtrs],
  );

  const out = new Map<string, number>();
  for (const [clusterId, members] of clusters) {
    const memberSet = new Set(members.map((m) => m.rvtr));
    let shared = 0;
    for (const row of rows) {
      const overlap = row.rvtrs.filter((r) => memberSet.has(r));
      if (overlap.length > 1) shared += 1;
    }
    out.set(clusterId, shared);
  }
  return out;
}

function scoreDuplicateConfidence(
  members: DuplicateClusterMember[],
  signals: string[],
): number {
  let score = 0.42;
  score += Math.min(0.28, (members.length - 1) * 0.12);
  if (signals.includes("title_artist_key_match")) score += 0.12;
  if (signals.includes("chart_year_proximity")) score += 0.1;
  if (signals.includes("chart_peak_overlap")) score += 0.08;
  if (signals.includes("linked_album_overlap")) score += 0.15;
  return Math.round(Math.min(0.98, score) * 1000) / 1000;
}

function buildCluster(
  clusterId: string,
  members: DuplicateClusterMember[],
  sharedAlbums: number,
): DuplicateClusterSummary {
  const signals: string[] = ["title_artist_key_match"];
  const years = members.map((m) => m.releaseYear).filter((y): y is number => y != null);
  if (years.length >= 2) {
    const spread = Math.max(...years) - Math.min(...years);
    if (spread <= 4) signals.push("chart_year_proximity");
  }
  const peaks = members.map((m) => m.peakHot100).filter((p): p is number => p != null);
  if (peaks.length >= 2) {
    const spread = Math.max(...peaks) - Math.min(...peaks);
    if (spread <= 15) signals.push("chart_peak_overlap");
  }
  if (sharedAlbums > 0) signals.push("linked_album_overlap");

  const canonical = pickProbableCanonical(members);
  const duplicateConfidence = scoreDuplicateConfidence(members, signals);

  return {
    clusterId,
    titleKey: normalizeTrackTitleKey(members[0]!.title),
    artistKey: normalizeArtistKey(members[0]!.artistName),
    displayTitle: members[0]!.title,
    displayArtist: members[0]!.artistName,
    clusterSize: members.length,
    probableCanonicalRvtr: canonical.rvtr,
    probableCanonicalLabel: `${canonical.title} · ${canonical.artistName}`,
    duplicateConfidence,
    memberRvtrs: members.map((m) => m.rvtr),
    members,
    signals,
  };
}

let clusterIndexCache: {
  at: number;
  data: { clusters: DuplicateClusterSummary[]; byRvtr: Map<string, DuplicateClusterSummary> };
} | null = null;

const CLUSTER_INDEX_TTL_MS = 60_000;

/** Hot 100 duplicate RVTR clusters — fast SQL slice, no per-track audit. */
export async function loadDuplicateClusterIndex(): Promise<{
  clusters: DuplicateClusterSummary[];
  byRvtr: Map<string, DuplicateClusterSummary>;
}> {
  if (clusterIndexCache && Date.now() - clusterIndexCache.at < CLUSTER_INDEX_TTL_MS) {
    return clusterIndexCache.data;
  }
  const rows = await inspectQuery<MemberRow>(
    `
    WITH hot AS (
      SELECT
        ctd.track_id,
        ctd.canonical_title,
        ctd.canonical_artist_name,
        ctd.chart_weeks,
        ctd.peak_hot100_position,
        ctd.first_chart_date::text AS first_chart_date,
        (SELECT count(*)::int FROM canonical_album_tracks cat
          WHERE upper(trim(cat.canonical_track_key)) = upper(trim(ctd.track_id))) AS album_link_count
      FROM canonical_track_display ctd
      WHERE ctd.has_hot100 = true
        AND trim(coalesce(ctd.canonical_title, '')) <> ''
        AND trim(coalesce(ctd.canonical_artist_name, '')) <> ''
    ),
    keyed AS (
      SELECT
        hot.*,
        lower(regexp_replace(
          regexp_replace(lower(trim(canonical_title)), '[^a-z0-9]+', ' ', 'g'),
          '\\s+', ' ', 'g'
        )) AS title_key,
        lower(regexp_replace(trim(canonical_artist_name), '^the\\s+', '', 'i')) AS artist_key
      FROM hot
    ),
    dup_groups AS (
      SELECT title_key, artist_key
      FROM keyed
      GROUP BY 1, 2
      HAVING count(*) > 1
    )
    SELECT keyed.*
    FROM keyed
    INNER JOIN dup_groups dg USING (title_key, artist_key)
    ORDER BY keyed.chart_weeks DESC, keyed.peak_hot100_position ASC NULLS LAST
    LIMIT 120
    `,
  );

  const grouped = new Map<string, DuplicateClusterMember[]>();
  for (const row of rows) {
    const id = `${row.title_key}::${row.artist_key}`;
    const list = grouped.get(id) ?? [];
    list.push({
      rvtr: row.track_id.trim().toUpperCase(),
      title: row.canonical_title.trim(),
      artistName: row.canonical_artist_name.trim(),
      chartWeeks: row.chart_weeks,
      peakHot100: row.peak_hot100_position,
      releaseYear: yearFromDate(row.first_chart_date),
      albumLinkCount: row.album_link_count,
    });
    grouped.set(id, list);
  }

  const overlapByCluster = await loadSharedAlbumOverlapByCluster(grouped);

  const clusters: DuplicateClusterSummary[] = [];
  const byRvtr = new Map<string, DuplicateClusterSummary>();

  for (const [clusterId, members] of grouped) {
    const sharedAlbums = overlapByCluster.get(clusterId) ?? 0;
    const cluster = buildCluster(clusterId, members, sharedAlbums);
    clusters.push(cluster);
    for (const m of members) {
      byRvtr.set(m.rvtr, cluster);
    }
  }

  clusters.sort(
    (a, b) =>
      b.duplicateConfidence - a.duplicateConfidence ||
      b.clusterSize - a.clusterSize,
  );

  const data = { clusters, byRvtr };
  clusterIndexCache = { at: Date.now(), data };
  return data;
}

export function clusterKeyForTrack(title: string, artist: string): string {
  return healingClusterKey(title, artist);
}
