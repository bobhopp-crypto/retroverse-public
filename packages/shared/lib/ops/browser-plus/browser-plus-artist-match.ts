import "server-only";

import { readFile, readdir } from "fs/promises";
import { basename, join } from "path";

import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { loadMatchCandidates } from "@/lib/sunday-nights/match-candidates";
import { normalizeMatchText } from "@/lib/sunday-nights/normalize-match-key";
import { songPackagesDir } from "@/lib/ops/intelligence/paths";

import type { BrowserPlusMatchPanelData, BrowserPlusMatchRow } from "@/lib/ops/browser-plus/types";

type CatalogRow = {
  rvtr: string;
  canonical_title: string;
  canonical_artist_name: string;
  peak_hot100_position: number | null;
  first_chart_date: string | null;
  has_hot100: boolean;
};

const RE_RVTR = /^RVTR\d{6}$/i;

const ARTIST_WHERE = `
  (
    lower(regexp_replace(trim(canonical_artist_name), '^the\\s+', '', 'i'))
      = lower(regexp_replace(trim($1), '^the\\s+', '', 'i'))
    OR canonical_artist_name ILIKE $2
  )
`;

function compactKey(value: string): string {
  return normalizeMatchText(value).replace(/[^a-z0-9']/g, "");
}

function wordSet(value: string): Set<string> {
  return new Set(
    normalizeMatchText(value)
      .split(/\s+/)
      .filter((word) => word.length > 2),
  );
}

/** Simple 0–100 similarity (artist or title). No AI. */
export function matchSimilarityScore(left: string, right: string): number {
  const a = compactKey(left);
  const b = compactKey(right);
  if (!a || !b) return 0;
  if (a === b) return 100;

  if (a.includes(b) || b.includes(a)) {
    const ratio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
    return Math.round(82 + ratio * 18);
  }

  const wordsA = wordSet(left);
  const wordsB = wordSet(right);
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let overlap = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) overlap += 1;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return Math.round((overlap / union) * 100);
}

export function combinedMatchScore(artist: string, title: string, row: CatalogRow): number {
  const artistScore = matchSimilarityScore(artist, row.canonical_artist_name);
  const titleScore = matchSimilarityScore(title, row.canonical_title);
  if (artistScore < 35) return Math.round(titleScore * 0.55);
  return Math.round(artistScore * 0.42 + titleScore * 0.58);
}

function yearFromDate(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const year = Number(value.slice(0, 4));
  return Number.isFinite(year) && year > 0 ? year : null;
}

function chartStatusLabel(row: CatalogRow): string {
  if (row.has_hot100 && row.peak_hot100_position != null) {
    return `Hot 100 peak #${row.peak_hot100_position}`;
  }
  if (row.has_hot100) return "Hot 100";
  if (row.first_chart_date) return "Charted";
  return "—";
}

export async function loadPackageStatusByRvtr(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  try {
    for (const file of await readdir(songPackagesDir())) {
      if (!/^RVTR\d{6}\.json$/i.test(file)) continue;
      try {
        const raw = await readFile(join(songPackagesDir(), file), "utf8");
        const parsed = JSON.parse(raw) as { rvtr?: string; status?: string };
        const rvtr = (parsed.rvtr ?? basename(file, ".json")).trim().toUpperCase();
        if (RE_RVTR.test(rvtr)) out.set(rvtr, parsed.status?.trim() || "draft");
      } catch {
        // skip malformed
      }
    }
  } catch {
    // no packages dir
  }
  return out;
}

async function loadArtistCatalog(artist: string, limit = 48): Promise<CatalogRow[]> {
  const needle = artist.trim();
  if (!needle) return [];

  return inspectQuery<CatalogRow>(
    `
    SELECT
      upper(trim(coalesce(retroverse_track_id, track_id))) AS rvtr,
      canonical_title,
      canonical_artist_name,
      peak_hot100_position,
      first_chart_date::text AS first_chart_date,
      coalesce(has_hot100, false) AS has_hot100
    FROM canonical_track_display
    WHERE coalesce(retroverse_track_id, track_id) ~* '^RVTR[0-9]{6}$'
      AND ${ARTIST_WHERE}
    ORDER BY
      has_hot100 DESC,
      peak_hot100_position ASC NULLS LAST,
      first_chart_date ASC NULLS LAST,
      canonical_title ASC
    LIMIT $3
    `,
    [needle, `%${needle}%`, limit],
  );
}

function mapCatalogRow(
  row: CatalogRow,
  packageStatus: Map<string, string>,
  matchScore: number | null,
): BrowserPlusMatchRow | null {
  const rvtr = row.rvtr?.trim().toUpperCase();
  if (!rvtr || !RE_RVTR.test(rvtr)) return null;
  return {
    rvtr,
    title: row.canonical_title.trim(),
    artistName: row.canonical_artist_name.trim(),
    chartYear: yearFromDate(row.first_chart_date),
    chartStatus: chartStatusLabel(row),
    packageStatus: packageStatus.get(rvtr) ?? "—",
    matchScore,
  };
}

export async function loadBrowserPlusMatchPanel(
  artist: string,
  title: string,
): Promise<BrowserPlusMatchPanelData> {
  const ping = await inspectPing();
  const artistNeedle = artist.trim();
  const titleNeedle = title.trim();

  if (!ping.ok || !artistNeedle) {
    return { artist: artistNeedle, title: titleNeedle, artistMatches: [], suggestedMatches: [] };
  }

  const [catalog, packageStatus, tierCandidates] = await Promise.all([
    loadArtistCatalog(artistNeedle),
    loadPackageStatusByRvtr(),
    titleNeedle ? loadMatchCandidates(artistNeedle, titleNeedle, 12) : Promise.resolve([]),
  ]);

  const artistMatches = catalog
    .map((row) => mapCatalogRow(row, packageStatus, null))
    .filter((row): row is BrowserPlusMatchRow => row != null);

  const scored = catalog
    .map((row) => ({
      row,
      score: titleNeedle ? combinedMatchScore(artistNeedle, titleNeedle, row) : 0,
    }))
    .filter((entry) => entry.score >= 40)
    .sort((a, b) => b.score - a.score || a.row.canonical_title.localeCompare(b.row.canonical_title));

  const suggestedFromCatalog = scored
    .slice(0, 10)
    .map((entry) => mapCatalogRow(entry.row, packageStatus, entry.score))
    .filter((row): row is BrowserPlusMatchRow => row != null);

  const seen = new Set(suggestedFromCatalog.map((row) => row.rvtr));
  for (const candidate of tierCandidates) {
    if (seen.has(candidate.rvtr)) continue;
    seen.add(candidate.rvtr);
    suggestedFromCatalog.push({
      rvtr: candidate.rvtr,
      title: candidate.title,
      artistName: candidate.artistName,
      chartYear: candidate.chartYear,
      chartStatus: candidate.isCharted
        ? candidate.peakHot100 != null
          ? `Hot 100 peak #${candidate.peakHot100}`
          : candidate.chartSource ?? "Charted"
        : "—",
      packageStatus: packageStatus.get(candidate.rvtr) ?? "—",
      matchScore: combinedMatchScore(artistNeedle, titleNeedle, {
        rvtr: candidate.rvtr,
        canonical_title: candidate.title,
        canonical_artist_name: candidate.artistName,
        peak_hot100_position: candidate.peakHot100,
        first_chart_date: candidate.firstChartDate ?? null,
        has_hot100: candidate.isCharted,
      }),
    });
    if (suggestedFromCatalog.length >= 12) break;
  }

  suggestedFromCatalog.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

  return {
    artist: artistNeedle,
    title: titleNeedle,
    artistMatches,
    suggestedMatches: suggestedFromCatalog,
  };
}
