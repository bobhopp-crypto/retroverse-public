import type { ChartHistoryEntry } from "@/lib/artist/chart-history-types";
import { chartFamilyKey } from "@/lib/artist/chart-history-display";
import { albumHrefFromToken } from "@/lib/public/canonical-public-hrefs";

export const HERO_COVER_SLOT_COUNT = 6;

export type YearHeroCover = {
  coverUrl: string;
  href: string | null;
};

export type HeroCoverCandidate = YearHeroCover;

export type HeroCoverFillResult = {
  requestedSlots: number;
  validCoversFound: number;
  skippedMissingCovers: string[];
  covers: YearHeroCover[];
};

export function isUsableCoverUrl(url: string | null | undefined): url is string {
  if (typeof url !== "string") return false;
  const t = url.trim();
  if (!t) return false;
  if (/placeholder|no[-_]?cover|missing/i.test(t)) return false;
  return true;
}

export function buildCoverToAlbumHrefMap(
  entries: ChartHistoryEntry[],
  rvYear: number,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of entries) {
    if (row.year !== rvYear || !isUsableCoverUrl(row.coverUrl)) continue;
    if (chartFamilyKey(row.chartName) !== "album-200") continue;
    const href = albumHrefFromToken(row.trackId);
    if (href) map.set(row.coverUrl, href);
  }
  return map;
}

/** Ordered candidate scan — essential albums, songs, ranked #1s, then full-year pool. */
export function buildHeroCoverCandidates(input: {
  essentialAlbumCovers: HeroCoverCandidate[];
  definingSongCovers: (string | null)[];
  rankedAlbumCovers: (string | null)[];
  rankedSongCovers: (string | null)[];
  poolCovers: string[];
  weeklyCovers: (string | null)[];
  hrefByCoverUrl: Map<string, string>;
}): HeroCoverCandidate[] {
  const seen = new Set<string>();
  const ordered: HeroCoverCandidate[] = [];

  const pushTile = (tile: HeroCoverCandidate) => {
    if (!isUsableCoverUrl(tile.coverUrl) || seen.has(tile.coverUrl)) return;
    seen.add(tile.coverUrl);
    ordered.push({
      coverUrl: tile.coverUrl,
      href: tile.href ?? input.hrefByCoverUrl.get(tile.coverUrl) ?? null,
    });
  };

  const pushUrl = (url: string | null | undefined) => {
    if (!isUsableCoverUrl(url)) return;
    pushTile({ coverUrl: url, href: input.hrefByCoverUrl.get(url) ?? null });
  };

  for (const tile of input.essentialAlbumCovers) pushTile(tile);
  for (const url of input.definingSongCovers) pushUrl(url);
  for (const url of input.rankedAlbumCovers) pushUrl(url);
  for (const url of input.rankedSongCovers) pushUrl(url);
  for (const url of input.poolCovers) pushUrl(url);
  for (const url of input.weeklyCovers) pushUrl(url);

  return ordered;
}

export function weeklyCoverScanOrder(entries: ChartHistoryEntry[], rvYear: number): string[] {
  const rows = entries
    .filter((row) => row.year === rvYear && isUsableCoverUrl(row.coverUrl))
    .sort((a, b) => {
      if (a.peakPosition !== b.peakPosition) return a.peakPosition - b.peakPosition;
      return a.chartDate.localeCompare(b.chartDate);
    });

  const seen = new Set<string>();
  const urls: string[] = [];
  for (const row of rows) {
    const url = row.coverUrl!;
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

export async function isReachableCoverUrl(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    let res = await fetch(url, { method: "HEAD", signal: controller.signal, cache: "no-store" });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: "GET",
        headers: { Range: "bytes=0-511" },
        signal: controller.signal,
        cache: "no-store",
      });
    }
    if (!res.ok) return false;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType && !contentType.startsWith("image/")) return false;
    const length = Number(res.headers.get("content-length") ?? "1");
    return !Number.isFinite(length) || length > 0;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function fillHeroCoverGrid(
  candidates: HeroCoverCandidate[],
  limit = HERO_COVER_SLOT_COUNT,
): Promise<HeroCoverFillResult> {
  const covers: YearHeroCover[] = [];
  const skippedMissingCovers: string[] = [];

  for (const candidate of candidates) {
    if (covers.length >= limit) break;
    if (!isUsableCoverUrl(candidate.coverUrl)) {
      skippedMissingCovers.push(candidate.coverUrl);
      continue;
    }
    if (await isReachableCoverUrl(candidate.coverUrl)) {
      covers.push({
        coverUrl: candidate.coverUrl,
        href: candidate.href,
      });
    } else {
      skippedMissingCovers.push(candidate.coverUrl);
    }
  }

  return {
    requestedSlots: limit,
    validCoversFound: covers.length,
    skippedMissingCovers,
    covers,
  };
}

export function rvalFromCoverTile(tile: YearHeroCover): string | null {
  const match = tile.href?.match(/RVAL\d{6}/i);
  return match ? match[0]!.toUpperCase() : null;
}
