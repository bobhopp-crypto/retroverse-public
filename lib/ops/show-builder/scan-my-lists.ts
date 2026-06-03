import { readdir } from "fs/promises";

import { isYearVdjFolder, yearFromVdjFolder, vdjMyListsDir } from "./vdj-paths";

export async function scanAvailableYears(): Promise<number[]> {
  let names: string[];
  try {
    names = await readdir(vdjMyListsDir());
  } catch {
    return [];
  }
  const years: number[] = [];
  for (const name of names) {
    if (!isYearVdjFolder(name)) continue;
    const year = yearFromVdjFolder(name);
    if (year != null) years.push(year);
  }
  return years.sort((a, b) => a - b);
}
