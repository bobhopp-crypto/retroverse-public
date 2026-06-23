import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

import { bundledDeckIndexPath } from "./paths";
import { normalizePackageRvtr } from "./song-package-store";

export type DeckIndex = {
  version: 1;
  updatedAt: string;
  decks: Array<{ rvtr: string }>;
};

export async function loadDeckIndex(): Promise<DeckIndex> {
  try {
    const parsed = JSON.parse(await readFile(bundledDeckIndexPath(), "utf8")) as Partial<DeckIndex>;
    const decks = Array.isArray(parsed.decks)
      ? parsed.decks
          .map((entry) => {
            const rvtr = entry && typeof entry === "object" ? normalizePackageRvtr((entry as { rvtr?: unknown }).rvtr as string) : null;
            return rvtr ? { rvtr } : null;
          })
          .filter((entry): entry is { rvtr: string } => Boolean(entry))
      : [];

    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
      decks,
    };
  } catch {
    return { version: 1, updatedAt: new Date().toISOString(), decks: [] };
  }
}

export async function saveDeckIndex(index: DeckIndex): Promise<DeckIndex> {
  const path = bundledDeckIndexPath();
  const rvtrs = [...new Set(index.decks.map((entry) => normalizePackageRvtr(entry.rvtr)).filter(Boolean) as string[])]
    .sort()
    .map((rvtr) => ({ rvtr }));
  const next: DeckIndex = {
    version: 1,
    updatedAt: new Date().toISOString(),
    decks: rvtrs,
  };
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}
