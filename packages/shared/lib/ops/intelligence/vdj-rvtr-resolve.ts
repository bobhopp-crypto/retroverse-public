import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

import { normVdjPath, type VdjLibraryEntry } from "./vdj-database";

const RVTR_RE = /^RVTR\d{6}$/i;

export type VdjRvtrMapping = {
  filePathNorm: string;
  rvtr: string;
  title: string;
  artist: string;
  method: "path_link" | "title_artist";
};

async function loadPathLinkIndex(): Promise<Map<string, VdjRvtrMapping>> {
  const ping = await inspectPing();
  if (!ping.ok) return new Map();

  const rows = await inspectQuery<{
    path_norm: string;
    rvtr: string;
    title: string;
    artist: string;
  }>(
    `
    SELECT DISTINCT ON (path_norm)
      lower(replace(replace(coalesce(ma.source_path, ''), '\\', '/'), '//', '/')) AS path_norm,
      upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id::text))) AS rvtr,
      ctd.canonical_title AS title,
      ctd.canonical_artist_name AS artist
    FROM media_assets ma
    JOIN media_track_links mtl ON mtl.media_asset_id = ma.id
    JOIN tracks t ON t.id = mtl.track_id::int
    LEFT JOIN canonical_track_versions ctv ON ctv.graph_track_id = t.id AND ctv.is_primary IS TRUE
    LEFT JOIN canonical_tracks ct ON ct.id = ctv.canonical_track_id
    JOIN canonical_track_display ctd ON ctd.id = ct.id
    WHERE ma.source_path IS NOT NULL
    ORDER BY path_norm, mtl.confidence_score DESC NULLS LAST
    `,
    [],
  );

  const out = new Map<string, VdjRvtrMapping>();
  for (const row of rows) {
    const rvtr = row.rvtr?.trim().toUpperCase();
    if (!rvtr || !RVTR_RE.test(rvtr)) continue;
    out.set(normVdjPath(row.path_norm), {
      filePathNorm: normVdjPath(row.path_norm),
      rvtr,
      title: row.title,
      artist: row.artist,
      method: "path_link",
    });
  }
  return out;
}

async function resolveByTitleArtist(
  entries: VdjLibraryEntry[],
): Promise<Map<string, VdjRvtrMapping>> {
  const out = new Map<string, VdjRvtrMapping>();
  const ping = await inspectPing();
  if (!ping.ok) return out;

  const candidates = entries.filter((e) => e.title.trim() && e.artist.trim());
  for (const entry of candidates) {
    const rows = await inspectQuery<{
      track_id: string;
      canonical_title: string;
      canonical_artist_name: string;
    }>(
      `
      SELECT track_id, canonical_title, canonical_artist_name
      FROM canonical_track_display
      WHERE lower(trim(canonical_title)) = lower(trim($1))
        AND lower(regexp_replace(trim(canonical_artist_name), '^the\\s+', '', 'i'))
          LIKE '%' || lower(regexp_replace(trim($2), '^the\\s+', '', 'i')) || '%'
      ORDER BY has_vdj_media DESC, peak_hot100_position ASC NULLS LAST
      LIMIT 1
      `,
      [entry.title, entry.artist],
    );
    const row = rows[0];
    if (!row) continue;
    const rvtr = row.track_id.trim().toUpperCase();
    if (!RVTR_RE.test(rvtr)) continue;
    out.set(entry.filePathNorm, {
      filePathNorm: entry.filePathNorm,
      rvtr,
      title: row.canonical_title,
      artist: row.canonical_artist_name,
      method: "title_artist",
    });
  }
  return out;
}

/** Resolve RVTR for VDJ library entries — path links first, then title/artist. */
export async function resolveRvtrsForVdjLibrary(
  entries: VdjLibraryEntry[],
): Promise<Map<string, VdjRvtrMapping>> {
  const pathIndex = await loadPathLinkIndex();
  const out = new Map<string, VdjRvtrMapping>();

  const unresolved: VdjLibraryEntry[] = [];
  for (const entry of entries) {
    const hit = pathIndex.get(entry.filePathNorm);
    if (hit) {
      out.set(entry.filePathNorm, hit);
    } else {
      unresolved.push(entry);
    }
  }

  if (unresolved.length > 0) {
    const forTitleMatch = unresolved.filter((e) => e.title.trim() && e.artist.trim());
    const byTitle = await resolveByTitleArtist(forTitleMatch);
    for (const [k, v] of byTitle) out.set(k, v);
  }

  return out;
}

/** @deprecated use resolveRvtrsForVdjLibrary */
export async function resolveRvtrsForVdjPaths(
  filePathNorms: string[],
): Promise<Map<string, VdjRvtrMapping>> {
  const pseudo: VdjLibraryEntry[] = filePathNorms.map((p) => ({
    filePath: p,
    filePathNorm: normVdjPath(p),
    artist: "",
    title: "",
    album: "",
    year: null,
    genre: "",
    remix: "",
    user1: "",
    label: "",
    user2: "",
    playCount: null,
    rating: null,
    lastPlayed: null,
    firstSeen: null,
    isVideo: false,
  }));
  return resolveRvtrsForVdjLibrary(pseudo);
}
