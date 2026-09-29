import "server-only";

import type { ArtistChartHistory, ChartHistoryEntry } from "@/lib/artist/chart-history-types";
import { loadStaticArtistChartHistory } from "@/lib/artist/static-artist-chart-history";
import { loadStaticLegacyArtistIdentity } from "@/lib/public/static-canonical-identities";
import { loadStaticYearPage } from "@/lib/rv-year/static-year-page";
import { normalizeRVYear } from "@/lib/search/normalize-rv-year";

export const ARTIST_CHART_PREVIEW_LIMIT = 400;
export const ARTIST_CHART_FULL_LIMIT = 2000;
export type ArtistChartHistoryScope = "preview" | "full";

export async function loadArtistChartHistory(
  artistId: number,
  _artistName: string,
  coverByTrackId: Map<string, string>,
  fallbackCover: string | null,
  rvYear?: number | null,
  scope: ArtistChartHistoryScope = "preview",
): Promise<ArtistChartHistory | null> {
  const identity = await loadStaticLegacyArtistIdentity(String(artistId));
  if (!identity) return null;
  const saved = await loadStaticArtistChartHistory(identity.rvar);
  if (!saved) return null;
  const year = normalizeRVYear(rvYear);
  const select = (entries: ChartHistoryEntry[]) => {
    const filtered = year == null ? entries : entries.filter((entry) => entry.year === year);
    const scoped = scope === "preview" ? filtered.slice(-ARTIST_CHART_PREVIEW_LIMIT) : filtered;
    return scoped.map((entry) => ({
      ...entry,
      coverUrl: coverByTrackId.get(entry.trackId.toUpperCase()) ?? entry.coverUrl ?? fallbackCover,
    }));
  };
  const entries = select(saved.entries);
  const weeklyEntries = select(saved.weeklyEntries ?? saved.entries);
  return entries.length ? {
    entries, weeklyEntries,
    activeYears: [...new Set(entries.map((entry) => entry.year))].sort((a, b) => a - b),
  } : null;
}

export async function loadRvYearChartHistory(
  rvYear: number,
  _coverByTrackId: Map<string, string> = new Map(),
  _fallbackCover: string | null = null,
): Promise<ArtistChartHistory | null> {
  const year = normalizeRVYear(rvYear);
  return year == null ? null : (await loadStaticYearPage(year))?.history ?? null;
}
