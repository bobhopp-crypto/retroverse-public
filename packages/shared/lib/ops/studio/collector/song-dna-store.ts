import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

import { collectorSongDnaPath } from "./paths";
import type { CollectorSongDna } from "./song-dna-types";

async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function loadSongDnaPackage(rvtr: string): Promise<CollectorSongDna | null> {
  try {
    const raw = await readFile(collectorSongDnaPath(rvtr), "utf8");
    return JSON.parse(raw) as CollectorSongDna;
  } catch {
    return null;
  }
}

export async function saveSongDnaPackage(pkg: CollectorSongDna): Promise<void> {
  await writeJson(collectorSongDnaPath(pkg.rvtr), pkg);
}
