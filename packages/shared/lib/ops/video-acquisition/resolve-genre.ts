import { scanVdjDatabase, type VdjLibraryEntry } from "@/lib/ops/intelligence/vdj-database";

import type { GenreSource } from "./types";

const RVTR_RE = /RVTR\d{6}/i;

function rvtrFromLabel(label: string | null | undefined): string | null {
  const match = label?.match(RVTR_RE);
  return match?.[0]?.toUpperCase() ?? null;
}

export function pickVdjAudioGenreForRvtr(
  entries: VdjLibraryEntry[],
  rvtr: string,
): { genre: string | null; genreSource: GenreSource } {
  const target = rvtr.trim().toUpperCase();
  for (const entry of entries) {
    if (entry.isVideo) continue;
    const entryRvtr = rvtrFromLabel(entry.label);
    if (entryRvtr !== target) continue;
    const genre = entry.genre?.trim() ?? "";
    if (genre) return { genre, genreSource: "vdj_audio" };
  }
  return { genre: null, genreSource: "none" };
}

export async function resolveTrustworthyGenre(
  rvtr: string,
): Promise<{ genre: string | null; genreSource: GenreSource }> {
  const scan = await scanVdjDatabase();
  return pickVdjAudioGenreForRvtr(scan.entries, rvtr);
}
