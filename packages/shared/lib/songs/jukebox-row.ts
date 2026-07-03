import { parsePeakPosition, parseYearFromText } from "@/lib/search/display-format";
import {
  coerceTrackPublicHref,
  sanitizePublicNavigationHref,
  trackPageHref,
} from "@/lib/search/entity-routes";
import { rvtrFromToken } from "@/lib/songs/song-actions";
import type { SongResult } from "@/lib/search/types";
import type { ArtistTrackCard } from "@/lib/artist/types";

export type JukeboxSongRow = {
  id: string;
  title: string;
  artist: string;
  rvtr?: string | null;
  releaseYear: number | null;
  peakHot100: number | null;
  chartWeeks: number;
  href?: string;
  coverUrl?: string;
};

/** Path for Next.js Link from panel id, RVTR code, or upstream href hint. */
export function songHrefFromId(
  id: string,
  title?: string,
  upstreamHref?: string | null,
): string | undefined {
  const raw = id.trim();
  if (!raw && !title?.trim()) return undefined;

  if (upstreamHref?.trim()) {
    const coerced = coerceTrackPublicHref(title ?? "", upstreamHref, raw);
    return coerced ? sanitizePublicNavigationHref(coerced) ?? undefined : undefined;
  }

  if (raw.startsWith("/") || /^https?:\/\//i.test(raw)) {
    const safe = sanitizePublicNavigationHref(raw);
    if (safe) return safe;
  }

  const rvtrInId = raw.match(/RVTR\d{6}/i)?.[0];
  if (rvtrInId) return trackPageHref(rvtrInId);

  if (/^RVTR\d+/i.test(raw)) return trackPageHref(raw);

  if (title?.trim()) return trackPageHref(title);

  return undefined;
}

export function parseWeeksFromChartNote(note?: string): number {
  if (!note) return 0;
  const m = note.match(/(\d+)\s*(?:wks?|weeks?)/i);
  if (!m) return 0;
  const n = Number.parseInt(m[1]!, 10);
  return Number.isFinite(n) ? n : 0;
}

export function artistTrackToJukeboxRow(
  track: ArtistTrackCard,
  artistName: string,
): JukeboxSongRow {
  return {
    id: track.rvtr,
    title: track.title,
    artist: artistName,
    rvtr: rvtrFromToken(track.rvtr),
    releaseYear: track.releaseYear,
    peakHot100: track.peakHot100,
    chartWeeks: track.chartWeeks,
    href: songHrefFromId(track.rvtr),
    coverUrl: track.coverUrl ?? undefined,
  };
}

function resolveSongReleaseYear(song: SongResult): number | null {
  if (song.year > 0) return song.year;
  return (
    parseYearFromText(song.chartNote) ??
    parseYearFromText(song.albumTitle) ??
    null
  );
}

export function songResultToJukeboxRow(song: SongResult): JukeboxSongRow {
  const note = song.chartNote;
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    rvtr: rvtrFromToken(song.id),
    releaseYear: resolveSongReleaseYear(song),
    peakHot100: parsePeakPosition(note),
    chartWeeks: parseWeeksFromChartNote(note),
    href: song.href ?? songHrefFromId(song.id, song.title),
    coverUrl: song.coverUrl,
  };
}
