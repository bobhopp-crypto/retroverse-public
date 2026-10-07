import { sortChartedSongsByPerformance } from "@/lib/songs/sort-charted-songs";

const RVTR_RE = /^RVTR\d{6}$/i;

/** Songs that defined the run. Stills for these are resolved before older chart entries. */
export const TOP_SONG_STILL_COUNT = 12;

/** Filesystem lookups for companion stills. Top songs, then owned songs, then signature tracks. */
export const COMPANION_STILL_LOOKUP_LIMIT = 24;

export type CompanionStillSong = {
  rvtr: string;
  title: string;
  peakHot100: number | null;
  chartWeeks: number;
  firstChartYear: number | null;
  firstChartDate?: string | null;
  coverageStatus?: string;
};

function remember(rvtr: string, seen: Set<string>, targets: string[], limit: number): void {
  if (targets.length >= limit) return;
  const key = rvtr.trim().toUpperCase();
  if (!RVTR_RE.test(key) || seen.has(key)) return;
  seen.add(key);
  targets.push(key);
}

/**
 * RVTRs whose hero-video.jpg should be loaded for the artist page.
 * Performance order first, so early chart dates cannot crowd out the visible top songs.
 */
export function companionStillTargets(input: {
  songs: readonly CompanionStillSong[];
  signatureRvtrs?: readonly string[];
  limit?: number;
}): string[] {
  const limit = input.limit ?? COMPANION_STILL_LOOKUP_LIMIT;
  const ranked = sortChartedSongsByPerformance([...input.songs]);
  const seen = new Set<string>();
  const targets: string[] = [];

  for (const song of ranked.slice(0, TOP_SONG_STILL_COUNT)) {
    remember(song.rvtr, seen, targets, limit);
  }
  for (const song of ranked) {
    if (song.coverageStatus !== "owned") continue;
    remember(song.rvtr, seen, targets, limit);
  }
  for (const rvtr of input.signatureRvtrs ?? []) {
    remember(rvtr, seen, targets, limit);
  }

  return targets;
}
