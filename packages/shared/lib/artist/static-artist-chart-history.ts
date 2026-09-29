import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import type { ArtistChartHistory } from "@/lib/artist/chart-history";
import type { RelatedArtistCard } from "@/lib/artist/types";

type Detail = { chartHistory: ArtistChartHistory | null; relatedArtists: RelatedArtistCard[] };
const cache = new Map<string, Promise<Record<string, Detail>>>();
const LIMIT = 4;

async function loadDetail(rvar: string): Promise<Detail | null> {
  const id = rvar.trim().toUpperCase();
  if (!/^RVAR\d{6}$/.test(id)) return null;
  const prefix = id.slice(4, 8);
  let pending = cache.get(prefix);
  if (!pending) {
    pending = readFile(join(process.cwd(), "data/static-graph/artist-details", `${prefix}.json.gz`))
      .then((bytes) => JSON.parse(gunzipSync(bytes).toString("utf8")) as Record<string, Detail>)
      .catch((error) => { cache.delete(prefix); throw error; });
    cache.set(prefix, pending);
    while (cache.size > LIMIT) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
  }
  return (await pending)[id] ?? null;
}

export async function loadStaticArtistChartHistory(rvar: string): Promise<ArtistChartHistory | null> {
  return (await loadDetail(rvar))?.chartHistory ?? null;
}

export async function loadStaticRelatedArtists(rvar: string): Promise<RelatedArtistCard[]> {
  return (await loadDetail(rvar))?.relatedArtists ?? [];
}
