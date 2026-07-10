/**
 * Build-time index of Billboard 200 chart fingerprints for album similarity.
 *
 * Run: npx tsx tools/album/build-chart-features-index.ts
 */
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

import {
  albumTitleKey,
  buildAlbumChartFeatures,
} from "@/lib/album/album-chart-features";
import type { AlbumChartFeaturesIndex } from "@/lib/album/load-album-chart-index";
import { chartsToTrajectoryWeeks } from "@/lib/track/charts-to-trajectory-weeks";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

type Row = {
  pg_album_id: number;
  rval: string;
  title: string;
  artist_name: string;
  release_year: number | null;
  b200_peak: number | null;
};

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) {
    console.error("Postgres unavailable");
    process.exit(1);
  }

  const albums = await inspectQuery<Row>(
    `
    SELECT
      al.id AS pg_album_id,
      upper(trim(aek.external_key)) AS rval,
      al.title,
      ar.canonical_name AS artist_name,
      al.release_year,
      min(ca.chart_position) FILTER (WHERE ca.chart_name = 'Billboard 200') AS b200_peak
    FROM albums al
    JOIN album_external_keys aek ON aek.album_id = al.id
    JOIN artists ar ON ar.id = al.artist_id
    JOIN chart_appearances ca ON ca.album_id = al.id AND ca.chart_name = 'Billboard 200'
    GROUP BY al.id, aek.external_key, al.title, ar.canonical_name, al.release_year
    HAVING count(ca.id) >= 4
    ORDER BY al.id
    `,
  );

  console.log(`Processing ${albums.length} charted albums…`);

  const out: AlbumChartFeaturesIndex["albums"] = [];
  const batchSize = 200;

  for (let offset = 0; offset < albums.length; offset += batchSize) {
    const batch = albums.slice(offset, offset + batchSize);
    const ids = batch.map((row) => row.pg_album_id);

    const chartRows = await inspectQuery<{
      album_id: number;
      chart_date: string;
      chart_position: number;
      weeks_on_chart: number;
    }>(
      `
      SELECT ca.album_id, ca.chart_date::text AS chart_date, ca.chart_position,
             COALESCE(ca.weeks_on_chart, 0)::int AS weeks_on_chart
      FROM chart_appearances ca
      WHERE ca.album_id = ANY($1::bigint[])
        AND ca.chart_name = 'Billboard 200'
      ORDER BY ca.album_id, ca.chart_date ASC
      `,
      [ids],
    );

    const byAlbum = new Map<number, typeof chartRows>();
    for (const row of chartRows) {
      const bucket = byAlbum.get(row.album_id) ?? [];
      bucket.push(row);
      byAlbum.set(row.album_id, bucket);
    }

    for (const album of batch) {
      const rows = byAlbum.get(album.pg_album_id) ?? [];
      const weeks = chartsToTrajectoryWeeks(
        rows.map((row) => ({
          chart_date: row.chart_date.slice(0, 10),
          chart_position: row.chart_position,
          weeks_on_chart: row.weeks_on_chart,
        })),
        { maxRank: 200 },
      );
      const features = buildAlbumChartFeatures(weeks, album.b200_peak);
      if (!features) continue;

      out.push({
        ...features,
        pgAlbumId: album.pg_album_id,
        rval: album.rval,
        title: album.title.trim(),
        artistName: album.artist_name.trim(),
        releaseYear: album.release_year,
        titleKey: albumTitleKey(album.title),
      });
    }

    console.log(`  ${Math.min(offset + batchSize, albums.length)} / ${albums.length}`);
  }

  const payload: AlbumChartFeaturesIndex = {
    version: 1,
    generatedAt: new Date().toISOString(),
    albums: out,
  };

  const outDir = join(process.cwd(), "data");
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, "album-chart-features.json");
  await writeFile(outPath, `${JSON.stringify(payload)}\n`, "utf8");
  console.log(`Wrote ${out.length} albums → ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
