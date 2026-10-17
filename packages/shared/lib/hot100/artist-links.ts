import "server-only";

import { artistPagePath, resolveLiveArtistName } from "@/lib/artist/resolve-artist";

/** Public artist hrefs for chart credits the canonical resolver matches exactly. */
export async function hot100ArtistHrefs(names: readonly string[]): Promise<Map<string, string | null>> {
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  const pairs = await Promise.all(
    unique.map(async (name) => {
      try {
        const resolved = await resolveLiveArtistName(name);
        return [name, resolved ? artistPagePath(resolved.rvar) : null] as const;
      } catch {
        return [name, null] as const;
      }
    }),
  );
  return new Map(pairs);
}
