import { readdir } from "fs/promises";

import { isYearVdjFolder, yearFromVdjFolder, vdjMyListsDir } from "./vdj-paths";

export type VdjFolderList = {
  /** Stable id for API (e.g. "1967", "Sunday Night"). */
  id: string;
  /** Display label in ops UI. */
  label: string;
  /** Year bucket when file is YYYY.vdjfolder. */
  year: number | null;
};

export async function scanAvailableYears(): Promise<number[]> {
  const lists = await scanVdjFolderLists();
  return lists
    .map((l) => l.year)
    .filter((y): y is number => y != null)
    .sort((a, b) => a - b);
}

/** All VirtualDJ MyLists .vdjfolder entries (year pools + named lists). */
export async function scanVdjFolderLists(): Promise<VdjFolderList[]> {
  let names: string[];
  try {
    names = await readdir(vdjMyListsDir());
  } catch {
    return [];
  }

  const lists: VdjFolderList[] = [];
  for (const name of names) {
    if (!name.endsWith(".vdjfolder")) continue;
    const base = name.replace(/\.vdjfolder$/i, "");
    if (!base.trim()) continue;

    if (isYearVdjFolder(name)) {
      const year = yearFromVdjFolder(name);
      if (year == null) continue;
      lists.push({
        id: String(year),
        label: `${year} Sunday`,
        year,
      });
      continue;
    }

    lists.push({
      id: base,
      label: base,
      year: null,
    });
  }

  lists.sort((a, b) => {
    if (a.year != null && b.year != null) return a.year - b.year;
    if (a.year != null) return -1;
    if (b.year != null) return 1;
    return a.label.localeCompare(b.label);
  });

  return lists;
}
