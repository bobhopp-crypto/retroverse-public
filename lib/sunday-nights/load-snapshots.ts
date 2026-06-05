import { readFile } from "fs/promises";
import { join } from "path";

import { SUNDAY_EVENT_YEARS } from "./playlist-types";
import type { SundayPlaylistSnapshot } from "./snapshot-types";
import type { SundayPlaylistListMeta, SundayPlaylistSong, SundayYearFilter } from "./playlist-types";

const SNAPSHOT_DIR = join(process.cwd(), "data", "sunday-nights", "snapshots");

export const SUNDAY_SNAPSHOT_PLAYLISTS: SundayPlaylistListMeta[] = SUNDAY_EVENT_YEARS.map(
  (year) => ({
    id: String(year),
    label: `${year} Sunday`,
    year,
  }),
);

async function loadSnapshotFile(year: number): Promise<SundayPlaylistSnapshot | null> {
  try {
    const raw = await readFile(join(SNAPSHOT_DIR, `${year}.json`), "utf8");
    return JSON.parse(raw) as SundayPlaylistSnapshot;
  } catch {
    return null;
  }
}

function snapshotSongToPlaylist(song: SundayPlaylistSnapshot["songs"][number]): SundayPlaylistSong {
  return {
    key: song.key,
    year: song.year,
    artist: song.artist,
    title: song.title,
    rvtr: song.rvtr,
    path: song.path ?? `snapshot://${song.year}/${song.key}`,
  };
}

export async function loadSundayEventSongsFromSnapshots(
  yearFilter: SundayYearFilter,
): Promise<SundayPlaylistSong[]> {
  const years = yearFilter === "all" ? [...SUNDAY_EVENT_YEARS] : [yearFilter];
  const chunks = await Promise.all(
    years.map(async (year) => {
      const snap = await loadSnapshotFile(year);
      return snap?.songs.map(snapshotSongToPlaylist) ?? [];
    }),
  );
  const songs = chunks.flat();
  songs.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.title.localeCompare(b.title);
  });
  return songs;
}
