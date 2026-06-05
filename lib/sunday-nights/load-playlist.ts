import { loadVdjFolderFile } from "@/lib/ops/show-builder/parse-vdjfolder";
import { scanVdjFolderLists } from "@/lib/ops/show-builder/scan-my-lists";
import { vdjMyListsDir } from "@/lib/ops/show-builder/vdj-paths";

import {
  loadSundayEventSongsFromSnapshots,
  SUNDAY_SNAPSHOT_PLAYLISTS,
} from "./load-snapshots";
import {
  SUNDAY_EVENT_YEARS,
  type SundayEventPayload,
  type SundayPlaylistSong,
  type SundayYearFilter,
} from "./playlist-types";
import { resolveRvtrForSongs } from "./resolve-rvtr";
import { useSundayNightsSnapshots } from "./storage-mode";
import {
  loadWorkingListAdditions,
  mergeWorkingListSongs,
} from "./working-list";

export {
  SUNDAY_EVENT_YEARS,
  type SundayEventPayload,
  type SundayPlaylistSong,
  type SundayYearFilter,
} from "./playlist-types";

function normPathKey(path: string): string {
  return path
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\\/g, "/")
    .trim();
}

function parseYearFilter(raw: string | null): SundayYearFilter {
  if (raw === "all") return "all";
  const y = Number(raw);
  if (SUNDAY_EVENT_YEARS.includes(y as (typeof SUNDAY_EVENT_YEARS)[number])) {
    return y as (typeof SUNDAY_EVENT_YEARS)[number];
  }
  return 1967;
}

async function loadYearSongsFromMyLists(year: number): Promise<SundayPlaylistSong[]> {
  const pool = await loadVdjFolderFile(String(year), year);
  const rvtrByPath = await resolveRvtrForSongs(
    pool.map((s) => ({ path: s.path, artist: s.artist, title: s.title })),
  );

  return pool.map((song) => ({
    key: song.key,
    year,
    artist: song.artist,
    title: song.title,
    rvtr: rvtrByPath.get(normPathKey(song.path)) ?? null,
    path: song.path,
  }));
}

/** Load Sunday Nights event songs for one year or all event years (1967/1978/1992). */
export async function loadSundayEventSongs(
  yearParam: string | null,
): Promise<SundayEventPayload> {
  const yearFilter = parseYearFilter(yearParam);

  if (useSundayNightsSnapshots()) {
    const songs = await loadSundayEventSongsFromSnapshots(yearFilter);
    return {
      yearFilter,
      playlists: SUNDAY_SNAPSHOT_PLAYLISTS,
      myListsPath: "snapshot",
      songs,
    };
  }

  const playlists = await scanVdjFolderLists();
  const years = yearFilter === "all" ? [...SUNDAY_EVENT_YEARS] : [yearFilter];

  const chunks = await Promise.all(
    years.map(async (year) => {
      try {
        return await loadYearSongsFromMyLists(year);
      } catch {
        return [];
      }
    }),
  );

  const additions = await loadWorkingListAdditions();
  const songs = mergeWorkingListSongs(chunks.flat(), additions, yearFilter);

  return {
    yearFilter,
    playlists,
    myListsPath: vdjMyListsDir(),
    songs,
  };
}

/** @deprecated Use loadSundayEventSongs — kept for playlist= API compat */
export async function loadSundayPlaylist(playlistId: string | null) {
  const year =
    playlistId && /^\d{4}$/.test(playlistId) ? playlistId : "1967";
  const event = await loadSundayEventSongs(year);
  return {
    playlists: event.playlists,
    myListsPath: event.myListsPath,
    selectedPlaylistId: year,
    songs: event.songs,
  };
}
