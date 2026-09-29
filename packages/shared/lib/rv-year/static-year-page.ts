import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

import type { ArtistChartHistory } from "@/lib/artist/chart-history";
import type { RvYearDestination } from "@/lib/rv-year/rv-year-destination";

type StaticYearPage = { year: number; history: ArtistChartHistory; destination: RvYearDestination };
const cache = new Map<number, Promise<StaticYearPage | null>>();
const LIMIT = 6;

export async function loadStaticYearPage(year: number): Promise<StaticYearPage | null> {
  if (!Number.isInteger(year) || year < 1950 || year > 2035) return null;
  let pending = cache.get(year);
  if (!pending) {
    pending = readFile(join(process.cwd(), "data/static-graph/years", `${year}.json.gz`))
      .then((bytes) => JSON.parse(gunzipSync(bytes).toString("utf8")) as StaticYearPage)
      .catch((error: NodeJS.ErrnoException) => {
        cache.delete(year);
        if (error.code === "ENOENT") return null;
        throw error;
      });
    cache.set(year, pending);
    while (cache.size > LIMIT) {
      const oldest = cache.keys().next().value;
      if (oldest != null) cache.delete(oldest);
    }
  }
  return pending;
}
