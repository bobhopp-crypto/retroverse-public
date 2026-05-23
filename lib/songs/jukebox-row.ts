import { parsePeakPosition, parseYearFromText } from "@/lib/search/display-format";
import type { SongResult } from "@/lib/search/types";
import type { ArtistTrackCard } from "@/lib/artist/types";

export type JukeboxSongRow = {
  id: string;
  title: string;
  artist: string;
  releaseYear: number | null;
  peakHot100: number | null;
  chartWeeks: number;
  href?: string;
  coverUrl?: string;
};

/** Path for Next.js Link from API id or RVTR code. */
export function songHrefFromId(id: string): string | undefined {
  const raw = id.trim();
  if (!raw) return undefined;
  if (raw.startsWith("/")) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^RVTR\d+/i.test(raw)) return `/tracks/${raw}`;
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
    releaseYear: resolveSongReleaseYear(song),
    peakHot100: parsePeakPosition(note),
    chartWeeks: parseWeeksFromChartNote(note),
    href: songHrefFromId(song.id),
    coverUrl: song.coverUrl,
  };
}
