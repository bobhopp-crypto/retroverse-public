import type { EpisodeBrowserRow } from "./episode-types";

export type { EpisodeBrowserRow, EpisodePerformanceSummary } from "./episode-types";

export function searchEpisodeRows(episodes: EpisodeBrowserRow[], q: string): EpisodeBrowserRow[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return episodes;

  return episodes.filter((ep) => {
    const haystack = [
      ep.episode_title,
      ep.episode_id,
      ep.air_date ?? "",
      ep.year != null ? String(ep.year) : "",
      ep.episode_number ?? "",
      ep.collection_title,
      ...ep.performances.flatMap((p) => [p.artist, p.title]),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(needle);
  });
}

export function groupEpisodesByYear(
  episodes: EpisodeBrowserRow[],
): { year: number | null; label: string; episodes: EpisodeBrowserRow[] }[] {
  const map = new Map<number | null, EpisodeBrowserRow[]>();
  for (const ep of episodes) {
    const y = ep.year;
    const list = map.get(y) ?? [];
    list.push(ep);
    map.set(y, list);
  }

  const years = [...map.keys()].sort((a, b) => (b ?? 0) - (a ?? 0));
  return years.map((year) => ({
    year,
    label: year != null ? String(year) : "Unknown year",
    episodes: map.get(year) ?? [],
  }));
}

export function episodeListLabel(ep: EpisodeBrowserRow): string {
  if (ep.episode_number) {
    const date = ep.air_date ? ` — ${ep.air_date}` : "";
    return `Ep ${ep.episode_number}${date}`;
  }
  return ep.episode_title;
}
