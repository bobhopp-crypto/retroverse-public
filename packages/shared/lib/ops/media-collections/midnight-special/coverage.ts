import { isEpisodeDownloaded } from "../download-episode";
import { listEpisodes } from "../state";
import { MS_HISTORICAL_EPISODE_COUNT, MS_PRIVATE_WATCHLIST } from "./constants";
import { MS_COLLECTION_ID } from "./paths";
import type { MsCoverageMetrics } from "./types";

export type { MsCoverageMetrics };

function pct(downloaded: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((downloaded / total) * 1000) / 10;
}

export function computeCoverageMetrics(
  downloaded: number,
  published: number,
  historical = MS_HISTORICAL_EPISODE_COUNT,
  privatePending = MS_PRIVATE_WATCHLIST.length,
): MsCoverageMetrics {
  const caught_up_with_official =
    published > 0 && downloaded >= Math.max(0, published - privatePending);

  const status_label = caught_up_with_official
    ? "Caught up with official releases"
    : `${downloaded} of ${published} published episodes acquired`;

  return {
    downloaded,
    published,
    historical,
    published_coverage_pct: pct(downloaded, published),
    historical_coverage_pct: pct(downloaded, historical),
    caught_up_with_official,
    status_label,
    private_pending: privatePending,
  };
}

export async function loadMidnightSpecialCoverage(
  publishedCount?: number,
): Promise<MsCoverageMetrics> {
  const episodes = await listEpisodes(MS_COLLECTION_ID);
  let downloaded = 0;
  for (const ep of episodes) {
    if (await isEpisodeDownloaded(MS_COLLECTION_ID, ep)) downloaded += 1;
  }

  const published = publishedCount ?? episodes.length;
  let privatePending = 0;
  for (const id of MS_PRIVATE_WATCHLIST) {
    const ep = episodes.find((e) => e.id === id);
    if (!ep || !(await isEpisodeDownloaded(MS_COLLECTION_ID, ep))) privatePending += 1;
  }

  return computeCoverageMetrics(downloaded, published, MS_HISTORICAL_EPISODE_COUNT, privatePending);
}
