import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

import type { ArtistPageData } from "@/lib/artist/types";
import type { ArtistCoverageSummary } from "@/lib/artist/load-artist-coverage-summary";
import type { AlbumPageData } from "@/lib/album/load-album-page";

type ArtistRecord = { page: ArtistPageData; coverage: ArtistCoverageSummary };
type CatalogKind = "artists" | "albums";
const MAX_SHARDS = 8;
const cache = new Map<string, Promise<Record<string, unknown>>>();

async function shard(kind: CatalogKind, prefix: string): Promise<Record<string, unknown>> {
  const key = `${kind}/${prefix}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = readFile(join(process.cwd(), "data/static-graph", kind, `${prefix}.json.gz`))
      .then((bytes) => JSON.parse(gunzipSync(bytes).toString("utf8")) as Record<string, unknown>)
      .catch((error) => { cache.delete(key); throw error; });
    cache.set(key, pending);
    while (cache.size > MAX_SHARDS) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
  }
  return pending;
}

export async function loadStaticArtistRecord(identity: string): Promise<ArtistRecord | null> {
  const rvar = identity.trim().toUpperCase();
  if (!/^RVAR\d{6}$/.test(rvar)) return null;
  const value = (await shard("artists", rvar.slice(4, 8)))[rvar];
  return value && typeof value === "object" ? value as ArtistRecord : null;
}

export async function loadStaticAlbumPage(identity: string): Promise<AlbumPageData | null> {
  const rval = identity.trim().toUpperCase();
  if (!/^RVAL\d{6}$/.test(rval)) return null;
  const value = (await shard("albums", rval.slice(4, 6)))[rval];
  return value && typeof value === "object" ? value as AlbumPageData : null;
}
