/** Unified Media Lab workspace URL helpers. */

export type MediaLabLibrarySection =
  | "imported"
  | "episodes"
  | "performances"
  | "exported"
  | "harvest"
  | "recent";

export type MediaLabWorkspaceParams = {
  library?: MediaLabLibrarySection;
  collection?: string;
  episode?: string;
  performance?: string;
  q?: string;
  year?: string;
  status?: string;
  classification?: string;
};

export function buildMediaLabWorkspaceHref(params: MediaLabWorkspaceParams): string {
  const search = new URLSearchParams();
  if (params.library) search.set("library", params.library);
  if (params.collection && params.collection !== "all") search.set("collection", params.collection);
  if (params.episode) search.set("episode", params.episode);
  if (params.performance) search.set("performance", params.performance);
  if (params.q) search.set("q", params.q);
  if (params.year && params.year !== "all") search.set("year", params.year);
  if (params.status && params.status !== "all") search.set("status", params.status);
  if (params.classification && params.classification !== "all") {
    search.set("classification", params.classification);
  }
  const qs = search.toString();
  return qs ? `/ops/media-lab?${qs}` : "/ops/media-lab";
}

/** Open a performance in the unified workspace editor (replaces clip_review href). */
export function buildMediaLabPerformanceHref(params: {
  episodeId: string;
  performanceId: string;
  collection?: string;
  library?: MediaLabLibrarySection;
}): string {
  return buildMediaLabWorkspaceHref({
    library: params.library ?? "performances",
    collection: params.collection ?? "midnight_special",
    episode: params.episodeId,
    performance: params.performanceId,
  });
}

/** Parse legacy clip_review URLs into workspace params. */
export function legacyClipReviewToWorkspace(search: URLSearchParams): MediaLabWorkspaceParams | null {
  if (search.get("mode") !== "clip_review") return null;
  const episode = search.get("episode")?.trim();
  const performance = search.get("performance")?.trim();
  if (!episode || !performance) return null;
  return {
    library: "performances",
    collection: search.get("collection")?.trim() || "midnight-special",
    episode,
    performance,
  };
}
