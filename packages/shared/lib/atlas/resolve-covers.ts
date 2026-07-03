import { loadTrackPage } from "@/lib/track/load-track-page";

/** Resolve album cover URLs for atlas presentation (existing track loader only). */
export async function resolveAtlasCoverMap(
  rvtrs: string[],
): Promise<Record<string, string | null>> {
  const unique = [...new Set(rvtrs.map((r) => r.trim().toUpperCase()).filter(Boolean))];
  const entries = await Promise.all(
    unique.map(async (rvtr) => {
      try {
        const page = await loadTrackPage(rvtr);
        return [rvtr, page?.coverUrl ?? null] as const;
      } catch {
        return [rvtr, null] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

/** Known mission RVTRs for world-map territory cards (presentation only). */
export const TERRITORY_MISSION_RVTR: Record<string, string> = {
  "1970s": "RVTR097615",
  "1980s": "RVTR347287",
};

export const TERRITORY_MISSION_DETAIL: Record<
  string,
  { verb: string; title: string; artist: string }
> = {
  "1970s": { verb: "Conquer", title: "Rhiannon", artist: "Fleetwood Mac" },
  "1960s": { verb: "Fortify", title: "Brown Eyed Girl", artist: "Van Morrison" },
  "1980s": { verb: "Fortify", title: "Night Moves", artist: "Bob Seger" },
};
