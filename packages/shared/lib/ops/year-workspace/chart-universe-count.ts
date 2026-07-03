import { inspectQuery } from "@/lib/inspect/pg";

/** Distinct Hot 100 tracks charting in `year` (Chart Universe — not the video table). */
export async function loadChartUniverseCount(year: number): Promise<number> {
  const rows = await inspectQuery<{ n: number }>(
    `
      SELECT count(DISTINCT ca.track_id)::int AS n
      FROM chart_appearances ca
      WHERE ca.chart_name = 'Billboard Hot 100'
        AND extract(year from ca.chart_date) = $1
    `,
    [year],
  );
  return rows[0]?.n ?? 0;
}
