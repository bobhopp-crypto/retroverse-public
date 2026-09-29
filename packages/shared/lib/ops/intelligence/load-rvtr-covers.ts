import { loadStaticTrackPage } from "@/lib/track/static-track-pages";

export type RvtrCoverInfo = {
  rvtr: string;
  coverUrl: string | null;
  coverSource: string | null;
  albumTitle: string | null;
};

/** Read the same cover and primary album already exported for public song pages. */
export async function loadCoverInfoForRvtrs(rvtrs: string[]): Promise<Map<string, RvtrCoverInfo>> {
  const unique = [...new Set(rvtrs.map((value) => value.trim().toUpperCase()))].filter(Boolean);
  const records = await Promise.all(unique.map(async (rvtr) => {
    const page = await loadStaticTrackPage(rvtr);
    return [rvtr, {
      rvtr,
      coverUrl: page?.coverUrl ?? null,
      coverSource: page?.coverUrl ? "Static track page" : null,
      albumTitle: page?.primaryAlbum?.title ?? null,
    }] as const;
  }));
  return new Map(records);
}
