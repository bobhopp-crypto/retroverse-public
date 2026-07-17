import { rvYearHref, RV_CHRONOLOGY_DEFAULT_YEAR } from "@/lib/rv/rv-chronology-paths";
import { SONG_EXPERIENCE_PREFIX } from "@/lib/search/entity-routes";

import type { SearchPanels } from "./types";

function slugFromArtistHref(href?: string): string | null {
  const match = href?.match(/\/artist\/([^/?#]+)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function resolveSearchArtistSlug(
  panels: SearchPanels,
  artistSlug?: string | null,
): string | null {
  if (/^\d+$/.test(artistSlug?.trim() ?? "")) return artistSlug!.trim();
  for (const item of panels.artistsCharts) {
    if (item.kind !== "artist") continue;
    const slug = slugFromArtistHref(item.artistHref);
    if (slug && /^\d+$/.test(slug)) return slug;
  }
  return null;
}

export function searchAlbumsViewAllHref(
  panels: SearchPanels,
  artistSlug?: string | null,
): string {
  const slug = resolveSearchArtistSlug(panels, artistSlug);
  if (slug) return `/artist/${slug}#essential-albums`;
  const firstAlbum = panels.albums.find((item) => item.href?.startsWith("/album/"));
  return firstAlbum?.href ?? rvYearHref(RV_CHRONOLOGY_DEFAULT_YEAR);
}

export function searchSongsViewAllHref(
  panels: SearchPanels,
  artistSlug?: string | null,
): string {
  const slug = resolveSearchArtistSlug(panels, artistSlug);
  if (slug) return `/artist/${slug}/songs`;
  const firstSong = panels.songs.find(
    (item) =>
      item.href?.startsWith(`${SONG_EXPERIENCE_PREFIX}/`) || item.href?.startsWith("/track/"),
  );
  return firstSong?.href ?? rvYearHref(RV_CHRONOLOGY_DEFAULT_YEAR);
}
