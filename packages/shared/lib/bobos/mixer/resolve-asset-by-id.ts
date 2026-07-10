import "server-only";

import { formatAssetId, type AssetReference } from "@/lib/bobos/mixer/types";

const RE_RVTR = /^RVTR(\d{6})$/i;
const RE_RVAL = /^RVAL(\d{6})$/i;

/**
 * Exact canonical-ID lookup for the Asset Browser (e.g. "RVTR215144").
 * `querySearchEntities` only matches on title/artist text, so an ID typed
 * verbatim never surfaces there — this is the direct-by-ID path for the
 * two asset kinds that actually carry a stable external key in Postgres.
 * RVAR/RVWK/RVEV have no canonical ID column in the schema yet, so they
 * fall through to the normal (empty) search result rather than guessing.
 */
export async function resolveAssetByRvId(query: string): Promise<AssetReference | null> {
  const trimmed = query.trim();

  const rvtr = trimmed.match(RE_RVTR)?.[0];
  if (rvtr) return resolveTrackByRvtr(rvtr.toUpperCase());

  const rval = trimmed.match(RE_RVAL)?.[0];
  if (rval) return resolveAlbumByRval(rval.toUpperCase());

  return null;
}

async function resolveTrackByRvtr(rvtr: string): Promise<AssetReference | null> {
  const { inspectPing, inspectQuery } = await import("@/lib/inspect/pg");
  const ping = await inspectPing();
  if (!ping.ok) return null;

  const rows = await inspectQuery<{
    track_id: string;
    canonical_title: string;
    canonical_artist_name: string;
  }>(
    `
    SELECT track_id, canonical_title, canonical_artist_name
    FROM canonical_track_display
    WHERE upper(trim(track_id)) = $1
    LIMIT 1
    `,
    [rvtr],
  );
  const row = rows[0];
  if (!row) return null;

  return {
    assetId: formatAssetId("track", row.track_id),
    kind: "track",
    title: row.canonical_title,
    subtitle: row.canonical_artist_name,
    coverUrl: null,
  };
}

async function resolveAlbumByRval(rval: string): Promise<AssetReference | null> {
  const { inspectPing, inspectQuery } = await import("@/lib/inspect/pg");
  const ping = await inspectPing();
  if (!ping.ok) return null;

  const rows = await inspectQuery<{
    title: string;
    artist_name: string;
    external_key: string;
  }>(
    `
    SELECT al.title, ar.canonical_name AS artist_name, aek.external_key
    FROM albums al
    JOIN artists ar ON ar.id = al.artist_id
    JOIN album_external_keys aek ON aek.album_id = al.id
    WHERE upper(trim(aek.external_key)) = $1
    LIMIT 1
    `,
    [rval],
  );
  const row = rows[0];
  if (!row) return null;

  return {
    assetId: formatAssetId("album", row.external_key),
    kind: "album",
    title: row.title,
    subtitle: row.artist_name,
    coverUrl: null,
  };
}
