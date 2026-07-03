import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import type { SundayPlaylistSong, SundayYearFilter } from "./playlist-types";

export type WorkingListAddition = {
  key: string;
  bankYear: SundayYearFilter;
  year: number;
  artist: string;
  title: string;
  rvtr: string | null;
  path: string;
  addedAt: string;
};

type WorkingListFile = {
  version: 1;
  additions: WorkingListAddition[];
  updatedAt: string;
};

function storePath(): string {
  return join(opsStateDir(), "sunday-nights", "working-additions.json");
}

function emptyFile(): WorkingListFile {
  const now = new Date().toISOString();
  return { version: 1, additions: [], updatedAt: now };
}

export async function loadWorkingListAdditions(): Promise<WorkingListAddition[]> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<WorkingListFile>;
    if (parsed.version !== 1 || !Array.isArray(parsed.additions)) return [];
    return parsed.additions.filter(
      (row): row is WorkingListAddition =>
        Boolean(row) &&
        typeof row.key === "string" &&
        typeof row.bankYear !== "undefined" &&
        typeof row.artist === "string" &&
        typeof row.title === "string" &&
        typeof row.path === "string",
    );
  } catch {
    return [];
  }
}

export async function addWorkingListEntry(
  entry: Omit<WorkingListAddition, "addedAt" | "key"> & { key?: string },
): Promise<WorkingListAddition> {
  const additions = await loadWorkingListAdditions();
  const key =
    entry.key?.trim() ||
    `add-${entry.bankYear}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const row: WorkingListAddition = {
    key,
    bankYear: entry.bankYear,
    year: entry.year,
    artist: entry.artist.trim(),
    title: entry.title.trim(),
    rvtr: entry.rvtr?.trim().toUpperCase() ?? null,
    path: entry.path.trim(),
    addedAt: new Date().toISOString(),
  };

  const withoutDup = additions.filter(
    (a) =>
      !(
        a.bankYear === row.bankYear &&
        a.path === row.path &&
        a.artist === row.artist &&
        a.title === row.title
      ),
  );
  withoutDup.unshift(row);

  const file: WorkingListFile = {
    version: 1,
    additions: withoutDup,
    updatedAt: row.addedAt,
  };

  const dir = join(opsStateDir(), "sunday-nights");
  await mkdir(dir, { recursive: true });
  await writeFile(storePath(), `${JSON.stringify(file, null, 2)}\n`, "utf8");
  return row;
}

export function mergeWorkingListSongs(
  songs: SundayPlaylistSong[],
  additions: WorkingListAddition[],
  yearFilter: SundayYearFilter,
): SundayPlaylistSong[] {
  const existingKeys = new Set(songs.map((s) => s.key));
  const existingPaths = new Set(songs.map((s) => s.path));

  const relevant = additions.filter((a) => {
    if (yearFilter === "all") return true;
    return a.bankYear === yearFilter || a.bankYear === "all";
  });

  const extra: SundayPlaylistSong[] = [];
  for (const row of relevant) {
    if (existingKeys.has(row.key) || existingPaths.has(row.path)) continue;
    extra.push({
      key: row.key,
      year: row.year,
      artist: row.artist,
      title: row.title,
      rvtr: row.rvtr,
      path: row.path,
    });
    existingKeys.add(row.key);
    existingPaths.add(row.path);
  }

  return [...extra, ...songs];
}
