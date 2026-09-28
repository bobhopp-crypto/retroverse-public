import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

import { coverPathToUrl } from "@/lib/artist/cover-url";
import { slugFromArtistName } from "@/lib/artist/slug";
import { dedupeSearchEntities } from "@/lib/search/dedupe-search-entities";
import { trackPageHref, yearSuggestionHref } from "@/lib/search/entity-routes";
import { normalizeSearchLabel, searchQueryTokens } from "@/lib/search/normalize-search-label";
import { applyCanonicalArtistDisplay, refineOverlayEntities } from "@/lib/search/refine-overlay-entities";
import { overlaySearchEntityLimits, searchBreadthTier, searchEntityLimits } from "@/lib/search/search-breadth";
import type { SearchEntity, SearchEntityType } from "@/lib/search/search-entity-types";
import { loadTrackPage } from "@/lib/track/load-track-page";

type IndexRow = {
  entity_type: SearchEntityType;
  label: string;
  normalized_label: string;
  rv_id: string | null;
  slug: string | null;
  artist_name: string | null;
  release_year: number | null;
  peak_hot100_position: number | null;
  chart_weeks: number | null;
  has_hot100: boolean | null;
  has_vdj_media: boolean | null;
  cover_path: string | null;
};

let indexPromise: Promise<IndexRow[]> | null = null;
async function indexRows(): Promise<IndexRow[]> {
  if (!indexPromise) {
    indexPromise = readFile(join(process.cwd(), "data/static-graph/search-entities.json.gz"))
      .then((bytes) => JSON.parse(gunzipSync(bytes).toString("utf8")) as IndexRow[])
      .catch((error) => { indexPromise = null; throw error; });
  }
  return indexPromise;
}

function rank(row: IndexRow, query: string): number {
  const title = normalizeSearchLabel(row.label);
  const label = row.normalized_label;
  const match = row.entity_type === "artist" && label === query ? 0
    : row.entity_type === "artist" && label.startsWith(query) ? 1
    : row.entity_type === "track" && title === query ? 2
    : row.entity_type === "track" && title.startsWith(query) ? 3
    : label === query ? 4
    : label.startsWith(query) ? 5
    : label.startsWith(`${query} `) ? 6
    : label.includes(` ${query}`) ? 7
    : 8;
  const type = { artist: 0, album: 1, track: 2, year: 3 }[row.entity_type];
  const chart = row.entity_type === "track"
    ? (row.has_hot100 ? -1200 : 0) + (row.peak_hot100_position != null ? row.peak_hot100_position * 5 : 900)
      - Math.min(row.chart_weeks ?? 0, 100) * 3 - (row.has_vdj_media ? 80 : 0)
    : 0;
  return match * 10 + type + chart;
}

function href(row: IndexRow): string {
  const id = row.rv_id?.trim().toUpperCase() ?? "";
  if (row.entity_type === "artist" && /^\d+$/.test(id)) return `/artist/${id}`;
  if (row.entity_type === "track" && /^RVTR\d{6}$/.test(id)) return trackPageHref(id);
  if (row.entity_type === "album" && /^RVAL\d{6}$/.test(id)) return `/album/${id}`;
  if (row.entity_type === "year" && row.release_year) return yearSuggestionHref(row.release_year);
  return "";
}

function entity(row: IndexRow, query: string, full: boolean): SearchEntity {
  return {
    entityType: row.entity_type,
    label: row.label,
    normalizedLabel: row.normalized_label,
    rvId: row.rv_id,
    slug: row.entity_type === "artist" && /^\d+$/.test(row.rv_id ?? "")
      ? row.rv_id! : row.slug?.trim() || slugFromArtistName(row.label),
    href: href(row),
    artist: row.artist_name,
    year: row.release_year,
    coverUrl: full ? coverPathToUrl(row.cover_path) : null,
    rank: rank(row, query),
  };
}

export type SearchEntityQueryMode = "overlay" | "full";
export type SearchEntityQueryMeta = { entitySource: "static"; pgTrgm: false };
export type SearchEntityQueryResult = { entities: SearchEntity[]; meta: SearchEntityQueryMeta };

/** Search a checked-in snapshot of the canonical catalog without a database connection. */
export async function querySearchEntities(
  query: string,
  options: { mode?: SearchEntityQueryMode } = {},
): Promise<SearchEntityQueryResult> {
  const q = normalizeSearchLabel(query);
  const meta = { entitySource: "static", pgTrgm: false } as const;
  if (!q) return { entities: [], meta };
  const full = options.mode !== "overlay";
  const tokens = searchQueryTokens(query);
  const matches = (await indexRows())
    .filter((row) => tokens.every((token) => row.normalized_label.includes(token)))
    .map((row) => entity(row, q, full))
    .filter((row) => row.href);
  matches.sort((a, b) => a.rank - b.rank || a.normalizedLabel.length - b.normalizedLabel.length || a.label.localeCompare(b.label));
  const caps = full ? searchEntityLimits(searchBreadthTier(query)) : overlaySearchEntityLimits(searchBreadthTier(query));
  const counts: Record<SearchEntityType, number> = { artist: 0, album: 0, track: 0, year: 0 };
  const selected = dedupeSearchEntities(matches).filter((row) => {
    if (counts[row.entityType] >= caps[row.entityType]) return false;
    counts[row.entityType] += 1;
    return true;
  });
  const refined = full ? applyCanonicalArtistDisplay(selected) : refineOverlayEntities(selected, query);
  if (full) {
    await Promise.all(refined.filter((row) => row.entityType === "track" && row.rvId).map(async (row) => {
      const track = await loadTrackPage(row.rvId!);
      if (track) {
        row.year = track.releaseYear ?? row.year;
        row.coverUrl = track.coverUrl ?? row.coverUrl;
      }
    }));
  }
  return { entities: refined, meta };
}
