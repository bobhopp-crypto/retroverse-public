import { listMidnightSpecialPerformanceRows } from "./ms-provider";
import type { PerformanceBrowserRow } from "./types";

export type EpisodeBrowserRow = {
  collection_id: string;
  collection_slug: string;
  collection_title: string;
  episode_id: string;
  episode_title: string;
  year: number | null;
  air_date?: string;
  performance_count: number;
  accepted_count: number;
  review_count: number;
  exported_count: number;
  performances: {
    performance_id: string;
    artist: string;
    title: string;
    status: PerformanceBrowserRow["status"];
    classification: PerformanceBrowserRow["classification"];
  }[];
};

export async function listEpisodeBrowserRows(
  collectionId = "midnight_special",
): Promise<EpisodeBrowserRow[]> {
  const rows = await listMidnightSpecialPerformanceRows();
  const filtered =
    collectionId === "all"
      ? rows
      : rows.filter((r) => r.collection_id === collectionId || r.collection_slug === collectionId);

  const byEpisode = new Map<string, PerformanceBrowserRow[]>();
  for (const row of filtered) {
    const list = byEpisode.get(row.episode_id) ?? [];
    list.push(row);
    byEpisode.set(row.episode_id, list);
  }

  const episodes: EpisodeBrowserRow[] = [];
  for (const [episodeId, perfs] of byEpisode) {
    const head = perfs[0]!;
    episodes.push({
      collection_id: head.collection_id,
      collection_slug: head.collection_slug,
      collection_title: head.collection_title,
      episode_id: episodeId,
      episode_title: head.episode_title,
      year: head.year,
      air_date: head.air_date,
      performance_count: perfs.length,
      accepted_count: perfs.filter((p) => p.status === "accepted" || p.status === "exported").length,
      review_count: perfs.filter((p) => p.status === "review").length,
      exported_count: perfs.filter((p) => p.status === "exported").length,
      performances: perfs.map((p) => ({
        performance_id: p.performance_id,
        artist: p.artist,
        title: p.title,
        status: p.status,
        classification: p.classification,
      })),
    });
  }

  episodes.sort((a, b) => {
    const ya = a.year ?? 0;
    const yb = b.year ?? 0;
    if (ya !== yb) return yb - ya;
    return a.episode_title.localeCompare(b.episode_title);
  });

  return episodes;
}
