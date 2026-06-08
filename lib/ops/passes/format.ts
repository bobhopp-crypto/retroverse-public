import type { PassDisplayData, PassGeneratorForm } from "./types";

const MONTHS = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

function upper(value: string): string {
  return value.trim().toUpperCase();
}

export function formatYearsLine(years: string): string {
  const parts = years
    .split(/[,•|/]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.join(" • ");
}

export function formatDateLine(date: string): string {
  const trimmed = date.trim();
  if (!trimmed) return "";

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime()) && /\d/.test(trimmed)) {
    const month = MONTHS[parsed.getMonth()] ?? "";
    const day = parsed.getDate();
    const year = parsed.getFullYear();
    return `${month} ${day}, ${year}`;
  }

  return upper(trimmed);
}

export function formatVenueLines(venue: string): string[] {
  const lines = venue
    .split(/\r?\n/)
    .map((line) => upper(line))
    .filter(Boolean);
  return lines.length ? lines : ["—"];
}

export function buildPassDisplay(form: Pick<PassGeneratorForm, "title" | "venue" | "date" | "years" | "style">): PassDisplayData {
  return {
    yearsLine: formatYearsLine(form.years),
    titleLine: upper(form.title),
    dateLine: formatDateLine(form.date),
    venueLines: formatVenueLines(form.venue),
    styleLine: upper(form.style),
  };
}

export function chunkPasses<T>(items: T[], perPage: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += perPage) {
    pages.push(items.slice(i, i + perPage));
  }
  return pages.length ? pages : [[]];
}

export const PASSES_PER_PAGE = 8;
