import { slugFromArtistName } from "@/lib/artist/slug";
import { rvChronologyHrefFromChartDate } from "@/lib/rv/rv-chronology-paths";
import { SONG_EXPERIENCE_PREFIX, trackPageHref } from "@/lib/search/entity-routes";

export type SongActionTarget = {
  title: string;
  artist: string;
  rvtr?: string | null;
  href?: string | null;
  artistSlug?: string | null;
  chartYear?: number | null;
  /** Chart week date (YYYY-MM-DD) for RV chronology deep links. */
  chartDate?: string | null;
  chartsHref?: string | null;
};

const RE_RVTR = /^RVTR\d{6}$/i;

export function rvtrFromToken(token: string | null | undefined): string | null {
  if (!token?.trim()) return null;
  const match = token.trim().match(/RVTR\d{6}/i)?.[0];
  return match ? match.toUpperCase() : null;
}

function isSongExperienceHref(href: string): boolean {
  const path = href.split("?")[0] ?? href;
  return path.startsWith(`${SONG_EXPERIENCE_PREFIX}/`) || path.startsWith("/track/");
}

export function songPageHrefForTarget(target: SongActionTarget): string | null {
  const fromRvtr = rvtrFromToken(target.rvtr);
  if (fromRvtr) return trackPageHref(fromRvtr);
  const rawHref = target.href?.trim();
  if (rawHref && isSongExperienceHref(rawHref)) {
    return trackPageHref(rawHref.split("/").pop() ?? rawHref);
  }
  const fromId = rvtrFromToken(target.title);
  if (fromId) return trackPageHref(fromId);
  if (target.title.trim()) return trackPageHref(target.title);
  return null;
}

export function songArtistHref(target: SongActionTarget): string | null {
  const slug = target.artistSlug?.trim() || slugFromArtistName(target.artist);
  return slug ? `/artist/${slug}` : null;
}

export function songRvYearHref(target: SongActionTarget): string | null {
  if (target.chartsHref?.trim()) return target.chartsHref.trim();
  return rvChronologyHrefFromChartDate(target.chartDate, target.chartYear);
}

export function songChartsHref(target: SongActionTarget): string | null {
  if (target.chartsHref?.trim()) return target.chartsHref.trim();
  const artist = songArtistHref(target);
  return artist ? `${artist}/charts` : null;
}

/** Curate / inspect — existing graph inspector workflow. */
export function songInspectHref(target: SongActionTarget): string {
  const rvtr = rvtrFromToken(target.rvtr);
  if (rvtr) return `/database-explorer?q=${encodeURIComponent(rvtr)}`;
  const label = [target.artist, target.title].filter(Boolean).join(" ").trim();
  return `/database-explorer?q=${encodeURIComponent(label || target.title || "song")}`;
}

export function songActionTargetFromParts(parts: {
  title: string;
  artist: string;
  rvtr?: string | null;
  id?: string | null;
  href?: string | null;
  artistSlug?: string | null;
  chartYear?: number | null;
  chartDate?: string | null;
  chartsHref?: string | null;
}): SongActionTarget {
  return {
    title: parts.title,
    artist: parts.artist,
    rvtr: parts.rvtr ?? rvtrFromToken(parts.id ?? null),
    href: parts.href ?? null,
    artistSlug: parts.artistSlug ?? null,
    chartYear: parts.chartYear ?? null,
    chartDate: parts.chartDate ?? null,
    chartsHref: parts.chartsHref ?? null,
  };
}
