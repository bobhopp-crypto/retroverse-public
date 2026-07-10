import "server-only";

import { readFile } from "fs/promises";
import { join } from "path";

import { bundledIntelligenceRoot } from "@/lib/ops/intelligence/paths";
import { loadSongPackage } from "@/lib/ops/intelligence/song-package-store";
import type { ResearchVaultEntry } from "@/lib/ops/intelligence/song-package-types";

export type AlbumSourceHints = {
  wikiExcerpts: string[];
  labels: string[];
  genres: string[];
  certifications: string[];
  awards: string[];
  releaseDates: string[];
  majorSingles: string[];
};

function normalizeAlbumNeedle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titleMatchesAlbum(excerpt: string, albumTitle: string): boolean {
  const needle = normalizeAlbumNeedle(albumTitle);
  if (!needle) return false;
  const hay = excerpt.toLowerCase();
  if (hay.includes(needle)) return true;
  const firstWord = needle.split(" ")[0];
  return firstWord.length >= 4 && hay.includes(firstWord);
}

function vaultEntryMatchesAlbum(entry: ResearchVaultEntry, albumTitle: string): boolean {
  if (entry.id.toLowerCase().startsWith("wiki-album")) return titleMatchesAlbum(entry.excerpt, albumTitle);
  if (entry.url?.includes("wikipedia.org/wiki/")) {
    const slug = decodeURIComponent(entry.url.split("/wiki/")[1] ?? "")
      .replace(/_/g, " ")
      .toLowerCase();
    const needle = normalizeAlbumNeedle(albumTitle);
    return slug.includes(needle) || needle.includes(slug);
  }
  return false;
}

function extractLabels(text: string): string[] {
  const matches = [
    ...text.matchAll(/\b(?:released|issued|published)\s+(?:on|by)\s+([A-Z][A-Za-z0-9&.' -]{2,40})/g),
    ...text.matchAll(/\bby\s+([A-Z][A-Za-z0-9&.' -]{2,40})\s+Records\b/g),
  ];
  return [...new Set(matches.map((m) => m[1]!.trim()).filter((v) => v.length > 2))];
}

function extractGenres(text: string): string[] {
  const matches = [
    ...text.matchAll(/\b(?:pop|rock|soul|funk|jazz|country|hip hop|r&b|dance|electronic|folk|metal|punk)\s+(?:rock|pop|album|record)?/gi),
    ...text.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+album\b/g),
  ];
  return [...new Set(matches.map((m) => m[0]!.trim()).filter((v) => v.length > 2 && v.length < 40))].slice(0, 4);
}

function extractCertifications(text: string): string[] {
  const matches = [
    ...text.matchAll(/\b(\d+×\s*)?(platinum|gold|diamond|multi-platinum)\b/gi),
    ...text.matchAll(/\b(certified|certification)\s+([^.]{4,60})/gi),
  ];
  return [...new Set(matches.map((m) => (m[2] ? m[2] : m[0])!.trim()))].slice(0, 4);
}

function extractAwards(text: string): string[] {
  const matches = [
    ...text.matchAll(/\b(Grammy|Brit Award|MTV Video Music Award|American Music Award)[^.]{0,80}/gi),
  ];
  return [...new Set(matches.map((m) => m[0]!.trim()))].slice(0, 3);
}

function extractReleaseDates(text: string): string[] {
  const matches = [
    ...text.matchAll(
      /\b(?:released|issued)\s+(?:on\s+)?((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/gi,
    ),
  ];
  return [...new Set(matches.map((m) => m[1]!.trim()))].slice(0, 2);
}

function extractSingles(text: string, albumTitle: string): string[] {
  const quoted = [...text.matchAll(/"([^"]{2,48})"/g)].map((m) => m[1]!.trim());
  const filtered = quoted.filter((title) => title.toLowerCase() !== albumTitle.toLowerCase());
  return [...new Set(filtered)].slice(0, 6);
}

async function loadCollectorVault(rvtr: string): Promise<ResearchVaultEntry[]> {
  const path = join(bundledIntelligenceRoot(), "research-department", rvtr, "collector.json");
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as { researchVault?: ResearchVaultEntry[] };
    return Array.isArray(parsed.researchVault) ? parsed.researchVault : [];
  } catch {
    return [];
  }
}

/** Aggregate stored research hints from album track RVTR packages (no runtime scraping). */
export async function loadAlbumSourceHints(
  albumTitle: string,
  trackRvtrs: string[],
): Promise<AlbumSourceHints> {
  const wikiExcerpts: string[] = [];
  const labels: string[] = [];
  const genres: string[] = [];
  const certifications: string[] = [];
  const awards: string[] = [];
  const releaseDates: string[] = [];
  const majorSingles: string[] = [];

  const seenExcerptKeys = new Set<string>();

  for (const rvtr of trackRvtrs) {
    const token = rvtr.trim().toUpperCase();
    if (!token) continue;

    const [collectorVault, songPackage] = await Promise.all([
      loadCollectorVault(token),
      loadSongPackage(token),
    ]);

    const vault = [...collectorVault, ...(songPackage?.researchVault ?? [])];

    for (const entry of vault) {
      if (!entry.excerpt?.trim()) continue;
      if (!vaultEntryMatchesAlbum(entry, albumTitle)) continue;

      const key = entry.excerpt.slice(0, 120);
      if (seenExcerptKeys.has(key)) continue;
      seenExcerptKeys.add(key);
      wikiExcerpts.push(entry.excerpt.trim());

      labels.push(...extractLabels(entry.excerpt));
      genres.push(...extractGenres(entry.excerpt));
      certifications.push(...extractCertifications(entry.excerpt));
      awards.push(...extractAwards(entry.excerpt));
      releaseDates.push(...extractReleaseDates(entry.excerpt));
      majorSingles.push(...extractSingles(entry.excerpt, albumTitle));
    }
  }

  const dedupe = (items: string[]) => [...new Set(items.map((v) => v.trim()).filter(Boolean))];

  return {
    wikiExcerpts,
    labels: dedupe(labels).slice(0, 3),
    genres: dedupe(genres).slice(0, 4),
    certifications: dedupe(certifications).slice(0, 4),
    awards: dedupe(awards).slice(0, 3),
    releaseDates: dedupe(releaseDates).slice(0, 2),
    majorSingles: dedupe(majorSingles).slice(0, 6),
  };
}
