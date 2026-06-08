import { loadVdjMetaForPaths } from "@/lib/ops/rvtags-review/vdj-lookup";
import { loadYearPool } from "@/lib/ops/show-builder/parse-vdjfolder";
import { scanAvailableYears } from "@/lib/ops/show-builder/scan-my-lists";
import { clusterPoolSongs } from "@/lib/ops/show-builder/visual-clustering";
import { vdjMyListsDir } from "@/lib/ops/show-builder/vdj-paths";

import { buildDealSummary, dealUnassignedSongs } from "./deal";
import { crateSongKey, dedupeMyListsPool, songIdentity } from "./dedupe";
import type { CrateBuilderPayload } from "./types";
import { loadCrateBuilderState, saveCrateBuilderState } from "./state";

const CRATE_YEARS = [1967, 1978, 1992] as const;

function normPath(p: string): string {
  return p
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\\/g, "/")
    .trim();
}

async function enrichPlayCounts(songs: Awaited<ReturnType<typeof loadYearPool>>): Promise<void> {
  const paths = songs.map((s) => normPath(s.path)).filter(Boolean);
  if (paths.length === 0) return;
  const vdjByPath = await loadVdjMetaForPaths(paths);
  for (const song of songs) {
    const vdj = vdjByPath.get(normPath(song.path));
    song.playCount =
      typeof vdj?.playCount === "number" && Number.isFinite(vdj.playCount) ? vdj.playCount : 0;
  }
}

export function isCrateBuilderYear(year: number): boolean {
  return (CRATE_YEARS as readonly number[]).includes(year);
}

function shouldDealCards(
  assignments: Record<string, string>,
  manualKeys: Set<string>,
  songKeys: Set<string>,
): boolean {
  for (const key of songKeys) {
    if (!assignments[key] && !manualKeys.has(key)) return true;
  }
  return false;
}

export async function loadCrateBuilder(year: number): Promise<CrateBuilderPayload> {
  const [rawPool, state, scannedYears] = await Promise.all([
    loadYearPool(year),
    loadCrateBuilderState(year),
    scanAvailableYears(),
  ]);

  await enrichPlayCounts(rawPool);
  const { songs: uniquePool, sourceRowCount, duplicateCount } = dedupeMyListsPool(rawPool);

  const clusterResult = clusterPoolSongs(uniquePool);

  const clusterByIdentity = new Map<
    string,
    { clusterId: string; bg: string; color: string }
  >();
  for (const song of uniquePool) {
    const hint = clusterResult.bySongKey.get(song.key);
    if (hint) {
      clusterByIdentity.set(songIdentity(song.artist, song.title), {
        clusterId: hint.clusterId,
        bg: hint.bg,
        color: hint.color,
      });
    }
  }

  const songs = uniquePool.map((song) => {
    const key = crateSongKey(year, song.artist, song.title);
    const cluster = clusterByIdentity.get(songIdentity(song.artist, song.title)) ?? null;
    return {
      key,
      year: song.year,
      artist: song.artist?.trim() || "Unknown artist",
      title: song.title?.trim() || "Unknown title",
      playCount: song.playCount ?? 0,
      cluster,
    };
  });

  const songKeySet = new Set(songs.map((s) => s.key));
  const manualKeySet = new Set(state.manualKeys.filter((k) => songKeySet.has(k)));
  let assignments = { ...state.assignments };
  let setOrder = { ...state.setOrder };

  if (shouldDealCards(assignments, manualKeySet, songKeySet)) {
    const preserved: Record<string, string> = {};
    for (const key of manualKeySet) {
      if (assignments[key]) preserved[key] = assignments[key];
    }

    const dealt = dealUnassignedSongs(songs, state.sets, preserved);
    assignments = dealt.assignments;
    setOrder = dealt.setOrder;

    state.assignments = assignments;
    state.setOrder = setOrder;
    await saveCrateBuilderState(state);
  }

  const setIds = new Set(state.sets.map((s) => s.id));
  const counts = new Map<string, number>();
  for (const s of state.sets) counts.set(s.id, 0);

  const filteredAssignments: Record<string, string> = {};
  for (const [key, setId] of Object.entries(assignments)) {
    if (!setIds.has(setId)) continue;
    if (!songKeySet.has(key)) continue;
    filteredAssignments[key] = setId;
    counts.set(setId, (counts.get(setId) ?? 0) + 1);
  }

  const availableYears = CRATE_YEARS.filter((y) => scannedYears.includes(y));
  const dealSummary = buildDealSummary(songs, state.sets, filteredAssignments);

  return {
    ok: true,
    year,
    availableYears: availableYears.length > 0 ? availableYears : [...CRATE_YEARS],
    songCount: songs.length,
    sourceRowCount,
    duplicateCount,
    clusterCount: clusterResult.clusters.length,
    sets: state.sets.map((s) => ({
      ...s,
      count: counts.get(s.id) ?? 0,
    })),
    songs,
    assignments: filteredAssignments,
    setOrder,
    manualKeys: [...manualKeySet],
    dealSummary,
    myListsPath: vdjMyListsDir(),
  };
}
