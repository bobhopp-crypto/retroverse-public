import "server-only";

import { cache } from "react";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

import { resolveAlbumCoverUrlFromRow } from "@/lib/artwork/resolve-album-cover-url";
import { resolveCanonicalArtist } from "@/lib/public/canonical-public-resolver";
import type { ArtistAlbumCard } from "@/lib/artist/types";

export type ArtistAlbumsData = { slug: string; displayName: string; albums: ArtistAlbumCard[] };
export type LoadArtistAlbumsOptions = { skipSearchCoverFallback?: boolean };

type AlbumRow = {
  pg_album_id: number; title: string; release_year: number | null; rval: string | null;
  b200_peak: number | null; cover_path: string | null; artwork_path: string | null; r2_cover_key: string | null;
};
type ArtistRows = { canonicalName: string; albums: AlbumRow[] };
let indexPromise: Promise<Record<string, ArtistRows>> | null = null;
async function index(): Promise<Record<string, ArtistRows>> {
  if (!indexPromise) indexPromise = readFile(join(process.cwd(), "data/static-graph/artist-albums.json.gz"))
    .then((bytes) => JSON.parse(gunzipSync(bytes).toString("utf8")) as Record<string, ArtistRows>)
    .catch((error) => { indexPromise = null; throw error; });
  return indexPromise;
}

async function loadArtistAlbumsImpl(slug: string, _options?: LoadArtistAlbumsOptions): Promise<ArtistAlbumsData> {
  const artist = await resolveCanonicalArtist(slug);
  if (!artist) return { slug: "0", displayName: "Unknown artist", albums: [] };
  const rows = (await index())[artist.rvar]?.albums ?? [];
  return {
    slug: artist.rvar,
    displayName: artist.displayName,
    albums: rows.map((row) => ({
      pgAlbumId: row.pg_album_id, title: row.title, releaseYear: row.release_year,
      rval: row.rval?.toUpperCase() ?? null, b200Peak: row.b200_peak,
      coverUrl: resolveAlbumCoverUrlFromRow(row),
    })),
  };
}
export const loadArtistAlbums = cache(loadArtistAlbumsImpl);
