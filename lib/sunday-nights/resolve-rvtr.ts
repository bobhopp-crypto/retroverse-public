import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { resolveChartOrbitTrack } from "@/lib/ops/chart-orbit/resolve-track";

import {
  loadRvtrAliasStore,
  lookupAliasRvtrFromStore,
} from "./rvtr-aliases";

function normPath(p: string): string {
  return p
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\\/g, "/")
    .trim();
}

type PathRvtrRow = {
  source_path: string;
  rvtr: string;
};

async function loadRvtrByPaths(paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(paths.map(normPath).filter(Boolean))];
  if (unique.length === 0) return out;

  const ping = await inspectPing();
  if (!ping.ok) return out;

  const rows = await inspectQuery<PathRvtrRow>(
    `
    SELECT DISTINCT ON (ma.source_path)
      ma.source_path,
      upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) AS rvtr
    FROM media_assets ma
    JOIN media_track_links mtl ON mtl.media_asset_id = ma.id
    JOIN canonical_track_display ctd ON ctd.track_id::text = mtl.track_id::text
    WHERE ma.source_path = ANY($1::text[])
    ORDER BY ma.source_path, mtl.confidence_score DESC NULLS LAST, ma.id ASC
    `,
    [unique],
  );

  for (const row of rows) {
    const key = normPath(row.source_path);
    const rvtr = row.rvtr?.trim().toUpperCase();
    if (key && rvtr) out.set(key, rvtr);
  }

  return out;
}

export async function resolveRvtrForSongs(
  songs: Array<{ path: string; artist: string; title: string }>,
): Promise<Map<string, string | null>> {
  const aliasStore = await loadRvtrAliasStore();
  const byPath = await loadRvtrByPaths(songs.map((s) => s.path));
  const out = new Map<string, string | null>();

  for (const song of songs) {
    const pathKey = normPath(song.path);
    const fromPath = byPath.get(pathKey);
    if (fromPath) {
      out.set(pathKey, fromPath);
      continue;
    }

    const fromAlias = lookupAliasRvtrFromStore(aliasStore, song.artist, song.title);
    if (fromAlias) {
      out.set(pathKey, fromAlias);
      continue;
    }

    const ping = await inspectPing();
    if (!ping.ok) {
      out.set(pathKey, null);
      continue;
    }

    const resolved = await resolveChartOrbitTrack(song.title, { artistHint: song.artist });
    out.set(pathKey, resolved?.rvtr ?? null);
  }

  return out;
}
