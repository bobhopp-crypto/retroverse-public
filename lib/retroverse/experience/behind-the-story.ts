import type { ResearchVaultEntry } from "@/lib/ops/intelligence/song-package-types";

import { sanitizePublicCopy } from "./public-copy";

export type BehindStorySection = {
  id: string;
  title: string;
  entries: BehindStoryEntry[];
};

export type BehindStoryEntry = {
  id: string;
  preview: string;
  url: string | null;
  sourceName: string;
};

const SECTION_ORDER = [
  "historical",
  "music",
  "recording",
  "television",
  "books",
  "interviews",
  "charts",
] as const;

type SectionKind = (typeof SECTION_ORDER)[number];

const SECTION_TITLES: Record<SectionKind, string> = {
  historical: "Historical References",
  music: "Music References",
  recording: "Recording References",
  television: "Television References",
  books: "Books",
  interviews: "Interviews",
  charts: "Charts",
};

function excerptPreview(text: string, max = 220): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}

function isInternalVaultEntry(entry: ResearchVaultEntry): boolean {
  const id = entry.id.toLowerCase();
  const source = entry.source.toLowerCase();
  if (id.startsWith("retroverse-")) return true;
  if (source.includes("retroverse")) return true;
  return false;
}

function resolveSourceName(entry: ResearchVaultEntry): string {
  if (entry.source?.trim()) return entry.source.trim();
  if (entry.id.startsWith("wiki")) return "Wikipedia";
  return "Reference";
}

function classifyVaultEntry(entry: ResearchVaultEntry): SectionKind {
  const url = entry.url.toLowerCase();
  const source = entry.source.toLowerCase();
  const excerpt = entry.excerpt.toLowerCase();

  if (source.includes("chart") || entry.id.toLowerCase().includes("chart")) return "charts";
  if (url.includes("imdb") || excerpt.includes("television") || excerpt.includes(" tv ")) {
    return "television";
  }
  if (url.includes("book") || source.includes("book") || excerpt.includes(" biography")) {
    return "books";
  }
  if (excerpt.includes("interview") || source.includes("interview")) return "interviews";
  if (
    url.includes("discogs") ||
    url.includes("allmusic") ||
    url.includes("billboard") ||
    source.includes("music")
  ) {
    return "music";
  }
  if (
    excerpt.includes("recorded") ||
    excerpt.includes("studio") ||
    excerpt.includes("producer") ||
    excerpt.includes("production")
  ) {
    return "recording";
  }
  if (url.includes("wikipedia") || entry.id.startsWith("wiki")) return "historical";
  return "historical";
}

/** Group external vault entries for the patron-facing Behind the Story section. */
export function buildBehindStorySections(vault: ResearchVaultEntry[]): BehindStorySection[] {
  const buckets = new Map<SectionKind, BehindStoryEntry[]>();

  for (const entry of vault) {
    if (isInternalVaultEntry(entry)) continue;
    const preview = sanitizePublicCopy(excerptPreview(entry.excerpt));
    if (preview.length < 48) continue;

    const kind = classifyVaultEntry(entry);
    const bucket = buckets.get(kind) ?? [];
    bucket.push({
      id: entry.id,
      preview,
      url: entry.url?.trim() || null,
      sourceName: resolveSourceName(entry),
    });
    buckets.set(kind, bucket);
  }

  return SECTION_ORDER.map((kind) => ({
    id: kind,
    title: SECTION_TITLES[kind],
    entries: buckets.get(kind) ?? [],
  })).filter((section) => section.entries.length > 0);
}
