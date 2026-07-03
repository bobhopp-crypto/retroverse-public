import type { ArtistTrackCard } from "@/lib/artist/types";

export function formatSongYear(year: number | null): string {
  return year != null ? String(year) : "—";
}

export function formatSongArtistYear(
  artistName: string,
  year: number | null,
): string {
  return `${artistName} · ${formatSongYear(year)}`;
}

export function formatSongPeakLabel(peak: number | null): string {
  if (peak == null) return "—";
  return `#${peak}`;
}

export function formatSongWeeksLabel(weeks: number): string {
  if (weeks <= 0) return "";
  return weeks === 1 ? "1 week" : `${weeks} weeks`;
}

/** Peak + weeks only (year shown separately on song cards). */
export function formatSongMetaTail(
  peak: number | null,
  weeks: number,
): string {
  const parts: string[] = [];
  if (peak != null) parts.push(`Peak #${peak}`);
  const w = formatSongWeeksLabel(weeks);
  if (w) parts.push(w);
  return parts.join(" • ");
}

/** Active row: `1972 • Peak #12 • 14 weeks` */
export function formatSongMetaLine(
  year: number | null,
  peak: number | null,
  weeks: number,
): string {
  const parts: string[] = [formatSongYear(year)];
  const tail = formatSongMetaTail(peak, weeks);
  if (tail) parts.push(tail);
  return parts.join(" • ");
}

export type SongTabDisplay = {
  indexLabel: string;
  title: string;
  artistYear: string;
  yearLabel: string;
  peakValue: string;
  weeksValue: string;
};

export function songTabFromTrack(
  track: ArtistTrackCard,
  index: number,
  artistName: string,
): SongTabDisplay {
  return {
    indexLabel: String(index + 1).padStart(2, "0"),
    title: track.title,
    artistYear: formatSongArtistYear(artistName, track.releaseYear),
    yearLabel: formatSongYear(track.releaseYear),
    peakValue: formatSongPeakLabel(track.peakHot100),
    weeksValue: formatSongWeeksLabel(track.chartWeeks),
  };
}
