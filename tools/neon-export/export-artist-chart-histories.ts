/** One-time exact snapshot for full artist charts and related-artists pages. */
import { access, mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getInspectPool, inspectQuery } from "@/lib/inspect/pg";
import { loadArtistChartHistory } from "./legacy-load-chart-history";
import { loadRelatedArtistsFromGraph } from "@/lib/artist/load-related-artists";

type Artist = { rvar: string; id: number; canonical_name: string };

async function main() {
  const folder = join(process.cwd(), "data/static-graph/artist-details");
  const artists = await inspectQuery<Artist>(`
    SELECT upper(trim(ar.rvar)) AS rvar, ar.id, ar.canonical_name
    FROM artists ar
    WHERE upper(trim(ar.rvar)) ~ '^RVAR[0-9]{6}$'
    ORDER BY ar.rvar
  `);
  const chartRows = await inspectQuery<{ id: number }>(`
    SELECT DISTINCT t.artist_id AS id FROM chart_appearances ca JOIN tracks t ON t.id = ca.track_id
    UNION SELECT DISTINCT al.artist_id AS id FROM chart_appearances ca JOIN albums al ON al.id = ca.album_id
  `);
  const charted = new Set(chartRows.map((row) => Number(row.id)));
  console.log(`artists with chart rows: ${charted.size}`);
  const groups = new Map<string, Artist[]>();
  for (const artist of artists) {
    const prefix = artist.rvar.slice(4, 8);
    groups.set(prefix, [...(groups.get(prefix) ?? []), artist]);
  }
  await mkdir(folder, { recursive: true });
  let done = 0;
  for (const [prefix, members] of groups) {
    const target = join(folder, `${prefix}.json`);
    if (process.argv.includes("--resume")) {
      try { await access(target); done += members.length; continue; } catch { /* export */ }
    }
    const details: Record<string, unknown> = {};
    const errors: string[] = [];
    let cursor = 0;
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (cursor < members.length) {
        const artist = members[cursor++]!;
        try {
          // A non-null empty fallback bypasses Next's request cache in this offline exporter.
          const [history, relatedArtists] = await Promise.all([
            charted.has(Number(artist.id))
              ? loadArtistChartHistory(artist.id, artist.canonical_name, new Map(), "", null, "full")
              : Promise.resolve(null),
            loadRelatedArtistsFromGraph(artist.id, artist.rvar, 12),
          ]);
          details[artist.rvar] = { chartHistory: history, relatedArtists };
        } catch (error) {
          errors.push(artist.rvar);
          if (errors.length === 1) console.error(`first artist chart error ${artist.rvar}: ${error instanceof Error ? error.message : "unknown"}`);
        }
      }
    }));
    if (errors.length) {
      await writeFile(join(folder, `${prefix}.errors.json`), JSON.stringify(errors));
      throw new Error(`${prefix}: ${errors.length} chart histories failed`);
    }
    const temp = `${target}.tmp`;
    await writeFile(temp, JSON.stringify(details));
    await rename(temp, target);
    done += members.length;
    console.log(`artist detail shard ${prefix}: ${members.length}; ${done}/${artists.length}`);
  }
  await getInspectPool().end();
  console.log(`artist details complete: ${done}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "artist chart export failed");
  process.exitCode = 1;
});
