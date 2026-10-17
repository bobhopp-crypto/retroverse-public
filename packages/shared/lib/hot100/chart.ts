/** Retroverse Hot 100 year-end chart helpers. Public pages only. */

export const HOT100_FIRST_YEAR = 1958;
export const HOT100_LAST_YEAR = 2024;
export const YOUTUBE_PLAYLIST_LIMIT = 50;
export const HOT100_CREDIT =
  "Retroverse year-end rankings, computed from weekly Billboard Hot 100 charts.";

export type Hot100Entry = {
  rank: number;
  title: string;
  artist: string;
  peak: number;
  weeks: number;
  weeksTop10: number;
  firstChart: string;
  lastChart: string;
  youtubeId: string | null;
};

export type YoutubePlaylistLink = {
  href: string;
  label: string;
};

const PRIVATE_PATH = /\/Users\/|\/workspace\/|file:\/\//i;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function hot100Years(): number[] {
  const years: number[] = [];
  for (let year = HOT100_FIRST_YEAR; year <= HOT100_LAST_YEAR; year += 1) years.push(year);
  return years;
}

export function isHot100Year(year: number): boolean {
  return Number.isInteger(year) && year >= HOT100_FIRST_YEAR && year <= HOT100_LAST_YEAR;
}

export function decadeHeading(year: number): string {
  return `The ${Math.floor(year / 10) * 10}s`;
}

function monthName(month: string): string | null {
  return MONTHS[Number(month) - 1] ?? null;
}

export function formatChartDate(iso: string): string {
  const match = ISO_DATE.exec(iso);
  if (!match) return iso;
  const month = monthName(match[2]!);
  if (!month) return iso;
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

export function formatChartRun(first: string, last: string): string {
  const start = ISO_DATE.exec(first);
  const end = ISO_DATE.exec(last);
  if (!start || !end) return `${first} – ${last}`;
  const startMonth = monthName(start[2]!);
  const endMonth = monthName(end[2]!);
  if (!startMonth || !endMonth) return `${first} – ${last}`;
  const startDay = Number(start[3]);
  const endDay = Number(end[3]);
  if (start[1] === end[1]) {
    if (start[2] === end[2] && startDay === endDay) return `${startMonth} ${startDay}, ${start[1]}`;
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${start[1]}`;
  }
  return `${startMonth} ${startDay}, ${start[1]} – ${endMonth} ${endDay}, ${end[1]}`;
}

export function youtubeIdFromUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  let id = "";
  if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] ?? "";
  else if (host === "youtube.com" || host === "m.youtube.com") id = url.searchParams.get("v") ?? "";
  else return null;
  return YOUTUBE_ID.test(id) ? id : null;
}

export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

/** No-login YouTube playlist URLs, at most 50 ids each, in chart order. */
export function youtubePlaylistLinks(ids: readonly string[]): YoutubePlaylistLink[] {
  const clean = ids.filter((id) => YOUTUBE_ID.test(id));
  if (clean.length === 0) return [];
  const links: YoutubePlaylistLink[] = [];
  for (let index = 0; index < clean.length; index += YOUTUBE_PLAYLIST_LIMIT) {
    const slice = clean.slice(index, index + YOUTUBE_PLAYLIST_LIMIT);
    const start = index + 1;
    const end = index + slice.length;
    links.push({
      href: `https://www.youtube.com/watch_videos?video_ids=${slice.join(",")}`,
      label: clean.length <= YOUTUBE_PLAYLIST_LIMIT ? "Play this year" : `Play this year · ${start}–${end}`,
    });
  }
  return links;
}

function plainText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > max || PRIVATE_PATH.test(trimmed)) return null;
  return trimmed;
}

function intIn(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) return null;
  return value;
}

export function parseHot100Year(year: number, raw: unknown): Hot100Entry[] {
  if (!Array.isArray(raw) || raw.length !== 100) {
    throw new Error(`Hot 100 ${year} must list 100 songs`);
  }
  const entries: Hot100Entry[] = [];
  const seen = new Set<number>();
  for (const item of raw) {
    if (!item || typeof item !== "object") throw new Error(`Hot 100 ${year} has a blank row`);
    const row = item as Record<string, unknown>;
    const rank = intIn(row.rank, 1, 100);
    const title = plainText(row.title, 200);
    const artist = plainText(row.artist, 200);
    const peak = intIn(row.peak, 1, 100);
    const weeks = intIn(row.weeks, 1, 520);
    const weeksTop10 = intIn(row.weeksTop10, 0, 520);
    const firstChart = typeof row.firstChart === "string" && ISO_DATE.test(row.firstChart) ? row.firstChart : null;
    const lastChart = typeof row.lastChart === "string" && ISO_DATE.test(row.lastChart) ? row.lastChart : null;
    const youtube = typeof row.youtube === "string" ? row.youtube : null;
    if (
      rank == null ||
      peak == null ||
      weeks == null ||
      weeksTop10 == null ||
      !title ||
      !artist ||
      !firstChart ||
      !lastChart ||
      youtube == null
    ) {
      throw new Error(`Hot 100 ${year} has an unreadable row`);
    }
    if (PRIVATE_PATH.test(youtube)) throw new Error(`Hot 100 ${year} rank ${rank} has a private path`);
    if (seen.has(rank)) throw new Error(`Hot 100 ${year} repeats rank ${rank}`);
    seen.add(rank);
    entries.push({
      rank,
      title,
      artist,
      peak,
      weeks,
      weeksTop10,
      firstChart,
      lastChart,
      youtubeId: youtubeIdFromUrl(youtube),
    });
  }
  entries.sort((a, b) => a.rank - b.rank);
  if (entries[0]?.rank !== 1 || entries[99]?.rank !== 100 || seen.size !== 100) {
    throw new Error(`Hot 100 ${year} is missing ranks`);
  }
  return entries;
}
