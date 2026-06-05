import { homedir } from "os";
import { join } from "path";

/** VirtualDJ My Lists folder (year .vdjfolder sources). */
export function vdjMyListsDir(): string {
  return (
    process.env.RETROVERSE_VDJ_MY_LISTS?.trim() ||
    join(homedir(), "Library/Application Support/VirtualDJ/MyLists")
  );
}

export function vdjExportDir(): string {
  return (
    process.env.RETROVERSE_VDJ_EXPORT_DIR?.trim() ||
    join(homedir(), "Library/Application Support/VirtualDJ/MyLists")
  );
}

const YEAR_FILE = /^(19\d{2}|20\d{2})\.vdjfolder$/;

export function isYearVdjFolder(name: string): boolean {
  return YEAR_FILE.test(name);
}

export function yearFromVdjFolder(name: string): number | null {
  const m = name.match(YEAR_FILE);
  if (!m) return null;
  return Number(m[1]);
}
