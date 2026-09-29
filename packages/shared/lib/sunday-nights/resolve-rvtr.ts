import { scanVdjDatabase } from "@/lib/ops/intelligence/vdj-database";
import { rvtrFromVdjLabel } from "@/lib/ops/intelligence/experience-inspector/vdj-rvtr-entries";

import { loadRvtrAliasStore, lookupAliasRvtrFromStore } from "./rvtr-aliases";

function normPath(path: string): string {
  return path.replace(/&apos;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\\/g, "/").trim();
}

/** Resolve local playlist items from VirtualDJ labels and saved aliases only. */
export async function resolveRvtrForSongs(
  songs: Array<{ path: string; artist: string; title: string }>,
): Promise<Map<string, string | null>> {
  const [aliasStore, library] = await Promise.all([
    loadRvtrAliasStore(),
    scanVdjDatabase().catch(() => null),
  ]);
  const byPath = new Map<string, string>();
  for (const entry of library?.entries ?? []) {
    const rvtr = rvtrFromVdjLabel(entry.label);
    if (rvtr) byPath.set(normPath(entry.filePath), rvtr);
  }
  const out = new Map<string, string | null>();
  for (const song of songs) {
    const key = normPath(song.path);
    out.set(key, byPath.get(key) ?? lookupAliasRvtrFromStore(aliasStore, song.artist, song.title));
  }
  return out;
}
