import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import type { PassArchiveEntry, PassArchiveFile } from "./types";

function archivePath(): string {
  return join(opsStateDir(), "passes", "archive.json");
}

function emptyArchive(): PassArchiveFile {
  return { version: 1, entries: [] };
}

export async function loadPassArchive(): Promise<PassArchiveFile> {
  try {
    const raw = await readFile(archivePath(), "utf8");
    const parsed = JSON.parse(raw) as PassArchiveFile;
    if (parsed?.version !== 1 || !Array.isArray(parsed.entries)) {
      return emptyArchive();
    }
    return parsed;
  } catch {
    return emptyArchive();
  }
}

export async function appendPassArchiveEntry(
  entry: Omit<PassArchiveEntry, "createdAt">,
): Promise<PassArchiveEntry> {
  const archive = await loadPassArchive();
  const saved: PassArchiveEntry = {
    ...entry,
    createdAt: new Date().toISOString(),
  };
  archive.entries.unshift(saved);
  await mkdir(join(opsStateDir(), "passes"), { recursive: true });
  await writeFile(archivePath(), `${JSON.stringify(archive, null, 2)}\n`, "utf8");
  return saved;
}
