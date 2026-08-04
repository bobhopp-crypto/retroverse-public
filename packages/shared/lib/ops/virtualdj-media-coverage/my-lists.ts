import "server-only";

import { createHash } from "crypto";
import { readFile, readdir, stat } from "fs/promises";
import { basename, join } from "path";

import { parseVdjFolderXml } from "@/lib/ops/show-builder/parse-vdjfolder";
import { vdjMyListsDir } from "@/lib/ops/show-builder/vdj-paths";

import { extractVersionMarkers } from "./version-evidence";
import type { CoverageTargetSong, MyListOption } from "./types";

const SAFE_MYLIST_NAME = /^[^/\\\0]{1,180}$/;

export function validateMyListName(value: string): string {
  const name = value.trim().replace(/\.vdjfolder$/i, "");
  if (!SAFE_MYLIST_NAME.test(name) || basename(name) !== name || name === "." || name === "..") {
    throw new Error("Invalid MyList name");
  }
  return name;
}

export async function listVirtualDjMyLists(): Promise<MyListOption[]> {
  const root = vdjMyListsDir();
  const entries = await readdir(root, { withFileTypes: true });
  const options = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".vdjfolder"))
      .map(async (entry) => {
        const name = validateMyListName(entry.name);
        const filePath = join(root, `${name}.vdjfolder`);
        const info = await stat(filePath);
        return {
          name,
          filename: `${name}.vdjfolder`,
          modifiedAt: info.mtime.toISOString(),
          sizeBytes: info.size,
        } satisfies MyListOption;
      }),
  );
  return options.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt) || a.name.localeCompare(b.name));
}

export async function loadMyListTargets(nameInput: string): Promise<{
  name: string;
  filename: string;
  path: string;
  targets: CoverageTargetSong[];
}> {
  const name = validateMyListName(nameInput);
  const root = vdjMyListsDir();
  const filePath = join(root, `${name}.vdjfolder`);
  const raw = await readFile(filePath, "utf8");
  const rows = parseVdjFolderXml(raw, 0);
  const occurrences = new Map<string, number>();
  const targets = rows.map((row, index): CoverageTargetSong => {
    const occurrence = occurrences.get(row.path) ?? 0;
    occurrences.set(row.path, occurrence + 1);
    const stable = createHash("sha256")
      .update(`${name}\0${row.path}\0${occurrence}`)
      .digest("hex")
      .slice(0, 20);
    return {
      targetRowKey: `mylist-${stable}`,
      position: index + 1,
      sourceIndex: row.sourceIdx,
      sourcePath: row.path,
      artist: row.artist,
      title: row.title,
      album: null,
      year: null,
      remix: row.remix,
      expectedDurationSeconds: row.songlength,
      requestedVersionMarkers: extractVersionMarkers(row.title, row.remix),
    };
  });
  return { name, filename: `${name}.vdjfolder`, path: filePath, targets };
}
