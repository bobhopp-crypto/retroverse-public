import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

type AlbumSignal = { peak: number | null; weeks: number };
type Row = AlbumSignal & { rval: string };
let promise: Promise<Map<string, AlbumSignal>> | null = null;

export async function staticAlbumSignals(): Promise<Map<string, AlbumSignal>> {
  if (!promise) {
    promise = readFile(join(process.cwd(), "data/static-graph/album-signals.json.gz"))
      .then((bytes) => JSON.parse(gunzipSync(bytes).toString("utf8")) as Row[])
      .then((rows) => new Map(rows.map(({ rval, peak, weeks }) => [rval, { peak, weeks }])))
      .catch((error) => { promise = null; throw error; });
  }
  return promise;
}
