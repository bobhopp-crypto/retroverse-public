import "server-only";

import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { groupDossiersForArtist, type DossierArtistShelf } from "@/lib/artist/dossier-group";

const MAC_ROOT = "/Users/bobhopp/RETROVERSE_DATA/bobos/media-dossiers";

function candidateRoots(): string[] {
  const fromEnv = process.env.RETROVERSE_MEDIA_DOSSIERS?.trim();
  const dataRoot = process.env.RETROVERSE_DATA_ROOT?.trim();
  return [
    fromEnv,
    dataRoot ? path.join(dataRoot, "bobos/media-dossiers") : null,
    MAC_ROOT,
  ].filter((root): root is string => Boolean(root));
}

async function existingRoot(): Promise<string | null> {
  for (const root of candidateRoots()) {
    try {
      const info = await stat(path.join(root, "index.jsonl"));
      if (info.isFile()) return root;
    } catch {
      /* next candidate */
    }
  }
  return null;
}

async function readIndex(root: string): Promise<unknown[]> {
  const text = await readFile(path.join(root, "index.jsonl"), "utf8");
  const rows: unknown[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      rows.push(JSON.parse(trimmed) as unknown);
    } catch {
      /* skip a broken line; do not fail the artist page */
    }
  }
  return rows;
}

let indexCache: { root: string; rows: unknown[] } | null = null;

async function loadIndex(): Promise<{ root: string; rows: unknown[] } | null> {
  const root = await existingRoot();
  if (!root) return null;
  if (indexCache?.root === root) return indexCache;
  const rows = await readIndex(root);
  indexCache = { root, rows };
  return indexCache;
}

/** Read-only Media Dossier shelf for one label artist. Null when the index is not mounted. */
export async function loadDossierShelf(artistName: string): Promise<DossierArtistShelf | null> {
  try {
    const index = await loadIndex();
    if (!index) return null;
    return groupDossiersForArtist(index.rows, artistName);
  } catch {
    return null;
  }
}
