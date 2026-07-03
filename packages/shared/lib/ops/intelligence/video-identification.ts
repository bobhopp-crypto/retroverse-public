import { resolveAlbumCoverUrlFromRow } from "@/lib/artwork/resolve-album-cover-url";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

import { normVdjPath, type VdjLibraryEntry } from "./vdj-database";

const RVTR_RE = /^RVTR\d{6}$/i;

export type VideoIdentificationMethod =
  | "direct_rvtr"
  | "path_match"
  | "cover_match"
  | "title_artist";

export type MediaAssetIndexRow = {
  pathNorm: string;
  mediaAssetId: number;
  hasTrackLink: boolean;
  rvtr: string | null;
};

export type TitleArtistIndexEntry = {
  rvtr: string;
  title: string;
  artist: string;
  hasCover: boolean;
};

function stripThe(s: string): string {
  return s.replace(/^the\s+/i, "").trim();
}

function normTitleArtist(title: string, artist: string): string {
  return `${title.trim().toLowerCase()}|${stripThe(artist).toLowerCase()}`;
}

const MTL_TO_CTD_JOIN = `
  JOIN tracks t ON t.id = mtl.track_id::int
  LEFT JOIN canonical_track_versions ctv ON ctv.graph_track_id = t.id AND ctv.is_primary IS TRUE
  LEFT JOIN canonical_tracks ct ON ct.id = ctv.canonical_track_id
  JOIN canonical_track_display ctd ON ctd.id = ct.id
`;

/** Paths with confirmed media_track_links → RVTR (legacy direct-link metric). */
export async function loadDirectRvtrPathIndex(): Promise<Map<string, string>> {
  const ping = await inspectPing();
  if (!ping.ok) return new Map();

  const rows = await inspectQuery<{ path_norm: string; rvtr: string }>(
    `
    SELECT DISTINCT ON (path_norm)
      lower(replace(replace(coalesce(ma.source_path, ''), '\\', '/'), '//', '/')) AS path_norm,
      upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id::text))) AS rvtr
    FROM media_assets ma
    INNER JOIN media_track_links mtl ON mtl.media_asset_id = ma.id
    ${MTL_TO_CTD_JOIN}
    WHERE ma.source_path IS NOT NULL
      AND trim(ma.source_path) <> ''
    ORDER BY path_norm, mtl.confidence_score DESC NULLS LAST, ma.id ASC
    `,
    [],
  );

  const out = new Map<string, string>();
  for (const row of rows) {
    const rvtr = row.rvtr?.trim().toUpperCase();
    if (!row.path_norm || !rvtr || !RVTR_RE.test(rvtr)) continue;
    out.set(row.path_norm, rvtr);
  }
  return out;
}

/** Load all Retroverse media_assets paths + optional RVTR link. */
export async function loadMediaAssetIndex(): Promise<Map<string, MediaAssetIndexRow>> {
  const ping = await inspectPing();
  if (!ping.ok) return new Map();

  const rows = await inspectQuery<{
    path_norm: string;
    media_id: number;
    rvtr: string | null;
    has_link: boolean;
  }>(
    `
    SELECT DISTINCT ON (path_norm)
      lower(replace(replace(coalesce(ma.source_path, ''), '\\', '/'), '//', '/')) AS path_norm,
      ma.id AS media_id,
      upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id::text))) AS rvtr,
      EXISTS (
        SELECT 1 FROM media_track_links mtl2 WHERE mtl2.media_asset_id = ma.id
      ) AS has_link
    FROM media_assets ma
    LEFT JOIN media_track_links mtl ON mtl.media_asset_id = ma.id
    LEFT JOIN tracks t ON t.id = mtl.track_id::int
    LEFT JOIN canonical_track_versions ctv ON ctv.graph_track_id = t.id AND ctv.is_primary IS TRUE
    LEFT JOIN canonical_tracks ct ON ct.id = ctv.canonical_track_id
    LEFT JOIN canonical_track_display ctd ON ctd.id = ct.id
    WHERE ma.source_path IS NOT NULL
      AND trim(ma.source_path) <> ''
    ORDER BY path_norm, mtl.confidence_score DESC NULLS LAST, ma.id ASC
    `,
    [],
  );

  const out = new Map<string, MediaAssetIndexRow>();
  for (const row of rows) {
    if (!row.path_norm) continue;
    const rvtr = row.rvtr?.trim().toUpperCase();
    out.set(row.path_norm, {
      pathNorm: row.path_norm,
      mediaAssetId: row.media_id,
      hasTrackLink: row.has_link,
      rvtr: rvtr && RVTR_RE.test(rvtr) ? rvtr : null,
    });
  }
  return out;
}

/** Canonical title/artist → RVTR + cover availability. */
export async function loadTitleArtistIndex(): Promise<{
  byTitleArtist: Map<string, TitleArtistIndexEntry>;
  coverByRvtr: Map<string, boolean>;
}> {
  const ping = await inspectPing();
  if (!ping.ok) return { byTitleArtist: new Map(), coverByRvtr: new Map() };

  const rows = await inspectQuery<{
    rvtr: string;
    title: string;
    artist: string;
    cover_path: string | null;
    artwork_path: string | null;
    r2_cover_key: string | null;
    has_vdj_media: boolean;
    peak: number | null;
  }>(
    `
    SELECT
      upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id::text))) AS rvtr,
      ctd.canonical_title AS title,
      ctd.canonical_artist_name AS artist,
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
      ) AS r2_cover_key,
      ctd.has_vdj_media,
      ctd.peak_hot100_position AS peak
    FROM canonical_track_display ctd
    LEFT JOIN canonical_album_tracks cat ON upper(trim(cat.canonical_track_key)) = upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id::text)))
    LEFT JOIN albums al ON al.id = cat.album_id
  `,
    [],
  );

  const byTitleArtist = new Map<string, TitleArtistIndexEntry>();
  const coverByRvtr = new Map<string, boolean>();
  for (const row of rows) {
    const rvtr = row.rvtr?.trim().toUpperCase();
    if (!rvtr || !RVTR_RE.test(rvtr)) continue;
    const coverUrl = resolveAlbumCoverUrlFromRow({
      cover_path: row.cover_path,
      artwork_path: row.artwork_path,
      r2_cover_key: row.r2_cover_key,
    });
    const entry: TitleArtistIndexEntry = {
      rvtr,
      title: row.title,
      artist: row.artist,
      hasCover: Boolean(coverUrl),
    };
    const key = normTitleArtist(row.title, row.artist);
    const existing = byTitleArtist.get(key);
    if (!existing) {
      byTitleArtist.set(key, entry);
    } else if (entry.hasCover && !existing.hasCover) {
      byTitleArtist.set(key, entry);
    }
    if (entry.hasCover) coverByRvtr.set(rvtr, true);
    else if (!coverByRvtr.has(rvtr)) coverByRvtr.set(rvtr, false);
  }
  return { byTitleArtist, coverByRvtr };
}

export type VideoIdentityResult = {
  filePath: string;
  filePathNorm: string;
  artist: string;
  title: string;
  playCount: number;
  directRvtr: boolean;
  pathMatch: boolean;
  coverMatch: boolean;
  titleArtistMatch: boolean;
  identifiable: boolean;
  rvtr: string | null;
  rvtrSource: VideoIdentificationMethod | null;
  mediaAssetId: number | null;
  hasCover: boolean;
  hasMediaTrackLink: boolean;
  researchReady: boolean;
  packageReady: boolean;
};

export function resolveVideoIdentity(
  entry: VdjLibraryEntry,
  mediaIndex: Map<string, MediaAssetIndexRow>,
  directRvtrByPath: Map<string, string>,
  titleArtistIndex: Map<string, TitleArtistIndexEntry>,
  coverByRvtr: Map<string, boolean>,
): VideoIdentityResult {
  const asset = mediaIndex.get(entry.filePathNorm);
  const rvtrFromDirectLink = directRvtrByPath.get(entry.filePathNorm) ?? null;
  const directRvtr = Boolean(rvtrFromDirectLink);
  const hasMediaTrackLink = Boolean(asset?.hasTrackLink);
  const pathMatch = Boolean(asset);

  let titleArtistMatch = false;
  let titleArtistRvtr: string | null = null;
  let titleArtistCover = false;
  if (entry.title.trim() && entry.artist.trim()) {
    const hit = titleArtistIndex.get(normTitleArtist(entry.title, entry.artist));
    if (hit) {
      titleArtistMatch = true;
      titleArtistRvtr = hit.rvtr;
      titleArtistCover = hit.hasCover;
    }
  }

  let rvtr: string | null = null;
  let rvtrSource: VideoIdentificationMethod | null = null;

  if (rvtrFromDirectLink) {
    rvtr = rvtrFromDirectLink;
    rvtrSource = "direct_rvtr";
  } else if (titleArtistMatch && titleArtistRvtr) {
    rvtr = titleArtistRvtr;
    rvtrSource = "title_artist";
  } else if (asset?.rvtr) {
    rvtr = asset.rvtr;
    rvtrSource = "path_match";
  }

  const coverMatch = rvtr ? Boolean(coverByRvtr.get(rvtr)) : titleArtistCover;
  const hasCover = coverMatch;
  const identifiable = directRvtr || pathMatch || titleArtistMatch || Boolean(rvtr);
  const researchReady = Boolean(entry.artist.trim() && entry.title.trim());
  const packageReady = researchReady && hasCover;

  return {
    filePath: entry.filePath,
    filePathNorm: entry.filePathNorm,
    artist: entry.artist,
    title: entry.title,
    playCount: entry.playCount ?? 0,
    directRvtr,
    pathMatch,
    coverMatch: hasCover,
    titleArtistMatch,
    identifiable,
    rvtr,
    rvtrSource,
    mediaAssetId: asset?.mediaAssetId ?? null,
    hasCover,
    hasMediaTrackLink,
    researchReady,
    packageReady,
  };
}

export type VideoIdentificationBucketCounts = {
  videoFiles: number;
  directRvtr: number;
  hasMediaTrackLink: number;
  pathMatch: number;
  coverMatch: number;
  titleArtistMatch: number;
  totalIdentifiable: number;
  researchReady: number;
  packageReady: number;
  uniqueRvtrs: number;
  legacyLinkedOnly: number;
};

export async function auditVideoIdentification(
  videos: VdjLibraryEntry[],
): Promise<{
  counts: VideoIdentificationBucketCounts;
  results: VideoIdentityResult[];
}> {
  const [mediaIndex, directRvtrByPath, titleArtist] = await Promise.all([
    loadMediaAssetIndex(),
    loadDirectRvtrPathIndex(),
    loadTitleArtistIndex(),
  ]);

  const results = videos.map((v) =>
    resolveVideoIdentity(
      v,
      mediaIndex,
      directRvtrByPath,
      titleArtist.byTitleArtist,
      titleArtist.coverByRvtr,
    ),
  );
  results.sort((a, b) => b.playCount - a.playCount);

  const uniqueRvtrs = new Set(results.filter((r) => r.rvtr).map((r) => r.rvtr!));

  const counts: VideoIdentificationBucketCounts = {
    videoFiles: videos.length,
    directRvtr: results.filter((r) => r.directRvtr).length,
    hasMediaTrackLink: results.filter((r) => r.hasMediaTrackLink).length,
    pathMatch: results.filter((r) => r.pathMatch).length,
    coverMatch: results.filter((r) => r.coverMatch).length,
    titleArtistMatch: results.filter((r) => r.titleArtistMatch).length,
    totalIdentifiable: results.filter((r) => r.identifiable).length,
    researchReady: results.filter((r) => r.researchReady).length,
    packageReady: results.filter((r) => r.packageReady).length,
    uniqueRvtrs: uniqueRvtrs.size,
    legacyLinkedOnly: results.filter((r) => r.directRvtr).length,
  };

  return { counts, results };
}

/** Normalize path for cross-system matching (VDJ + Postgres). */
export function normVideoPath(p: string): string {
  return normVdjPath(p);
}
