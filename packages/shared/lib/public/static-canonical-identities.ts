import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

import { resolveAlbumCoverUrlFromRow } from "@/lib/artwork/resolve-album-cover-url";
import { displayArtistName } from "@/lib/artist/slug";
import type { CanonicalAlbumIdentity, CanonicalArtistIdentity } from "./canonical-public-resolver";

type ArtistRow = { id: number; rvar: string; canonical_name: string };
type AlbumRow = {
  rval: string; album_id: number; artist_id: number; artist_rvar: string;
  title: string; release_year: number | null; artist_name: string;
  cover_path: string | null; artwork_path: string | null; r2_cover_key: string | null;
};

async function readSnapshot<T>(name: string): Promise<T[]> {
  const bytes = await readFile(join(process.cwd(), "data/static-graph", `${name}.json.gz`));
  return JSON.parse(gunzipSync(bytes).toString("utf8")) as T[];
}

let artistsPromise: Promise<{ byRvar: Map<string, ArtistRow>; byId: Map<number, ArtistRow> }> | null = null;
async function artists() {
  if (!artistsPromise) artistsPromise = readSnapshot<ArtistRow>("artist-identities").then((rows) => ({
    byRvar: new Map(rows.map((row) => [row.rvar, row])),
    byId: new Map(rows.map((row) => [row.id, row])),
  })).catch((error) => { artistsPromise = null; throw error; });
  return artistsPromise;
}

let albumsPromise: Promise<Map<string, AlbumRow>> | null = null;
async function albums() {
  if (!albumsPromise) albumsPromise = readSnapshot<AlbumRow>("album-identities")
    .then((rows) => new Map(rows.map((row) => [row.rval, row])))
    .catch((error) => { albumsPromise = null; throw error; });
  return albumsPromise;
}

function artistIdentity(row: ArtistRow, legacy = false): CanonicalArtistIdentity {
  return {
    artistId: Number(row.id), rvar: row.rvar, canonicalName: row.canonical_name.trim(),
    displayName: displayArtistName(row.canonical_name.trim()), routeToken: row.rvar,
    href: `/artist/${row.rvar}`,
    resolverPath: legacy ? [`legacy_artist_id:${row.id}`, `RVAR:${row.rvar}`, "redirect"]
      : [`RVAR:${row.rvar}`, `artist_id:${row.id}`, "static-artists", "render"],
    loaderTimings: [],
  };
}

export async function loadStaticArtistIdentity(identity: string): Promise<CanonicalArtistIdentity | null> {
  const rvar = decodeURIComponent(identity).trim().toUpperCase();
  if (!/^RVAR\d{6}$/.test(rvar)) return null;
  const row = (await artists()).byRvar.get(rvar);
  return row ? artistIdentity(row) : null;
}

export async function loadStaticLegacyArtistIdentity(identity: string): Promise<CanonicalArtistIdentity | null> {
  const raw = decodeURIComponent(identity).trim();
  if (!/^\d+$/.test(raw)) return null;
  const row = (await artists()).byId.get(Number(raw));
  return row ? artistIdentity(row, true) : null;
}

export async function loadStaticAlbumIdentity(identity: string): Promise<CanonicalAlbumIdentity | null> {
  const rval = decodeURIComponent(identity).trim().toUpperCase();
  if (!/^RVAL\d{6}$/.test(rval)) return null;
  const row = (await albums()).get(rval);
  if (!row) return null;
  return {
    albumId: Number(row.album_id), artistId: Number(row.artist_id), rval,
    title: row.title.trim(), releaseYear: row.release_year,
    artistCanonicalName: row.artist_name.trim(), artistDisplayName: displayArtistName(row.artist_name.trim()),
    artistHref: `/artist/${row.artist_rvar.trim().toUpperCase()}`,
    coverUrl: resolveAlbumCoverUrlFromRow(row),
    resolverPath: [`RVAL:${rval}`, `album_id:${row.album_id}`, `artist_id:${row.artist_id}`, "static-albums", "render"],
    loaderTimings: [],
  };
}
