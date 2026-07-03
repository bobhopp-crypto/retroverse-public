import { listMidnightSpecialPerformanceRows } from "./ms-provider";
import type {
  PerformanceBrowserCollection,
  PerformanceBrowserQuery,
  PerformanceBrowserResult,
  PerformanceBrowserRow,
} from "./types";

const FUTURE_COLLECTIONS: PerformanceBrowserCollection[] = [
  { id: "top_of_the_pops", slug: "top-of-the-pops", title: "Top of the Pops", enabled: false },
  { id: "live_aid", slug: "live-aid", title: "Live Aid", enabled: false },
  { id: "woodstock", slug: "woodstock", title: "Woodstock", enabled: false },
];

function normalizeQ(q?: string): string {
  return (q ?? "").trim().toLowerCase();
}

function rowMatchesSearch(row: PerformanceBrowserRow, q: string): boolean {
  if (!q) return true;
  const haystack = [
    row.artist,
    row.title,
    row.collection_title,
    row.collection_id,
    row.episode_id,
    row.episode_title,
    row.performance_id,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function applyFilters(
  rows: PerformanceBrowserRow[],
  query: PerformanceBrowserQuery,
): PerformanceBrowserRow[] {
  const q = normalizeQ(query.q);
  let filtered = rows;

  if (query.collection && query.collection !== "all") {
    filtered = filtered.filter(
      (r) => r.collection_id === query.collection || r.collection_slug === query.collection,
    );
  }

  if (query.year && query.year > 0) {
    filtered = filtered.filter((r) => r.year === query.year);
  }

  if (query.status && query.status !== "all") {
    filtered = filtered.filter((r) => r.status === query.status);
  }

  if (query.classification && query.classification !== "all") {
    filtered = filtered.filter((r) => r.classification === query.classification);
  }

  if (q) {
    filtered = filtered.filter((r) => rowMatchesSearch(r, q));
  }

  const limit = query.limit && query.limit > 0 ? query.limit : 500;
  return filtered.slice(0, limit);
}

function buildFacets(rows: PerformanceBrowserRow[]) {
  const years = new Set<number>();
  const statuses = new Set<PerformanceBrowserRow["status"]>();
  const classifications = new Set<string>();

  for (const row of rows) {
    if (row.year) years.add(row.year);
    statuses.add(row.status);
    classifications.add(row.classification);
  }

  return {
    years: [...years].sort((a, b) => b - a),
    statuses: [...statuses],
    classifications: [...classifications].sort(),
  };
}

export async function browsePerformances(
  query: PerformanceBrowserQuery = {},
): Promise<PerformanceBrowserResult> {
  const msRows = await listMidnightSpecialPerformanceRows();

  const collections: PerformanceBrowserCollection[] = [
    {
      id: "midnight_special",
      slug: "midnight-special",
      title: "Midnight Special",
      enabled: true,
      performance_count: msRows.length,
    },
    ...FUTURE_COLLECTIONS,
  ];

  const allRows = [...msRows];
  const filtered = applyFilters(allRows, query);

  return {
    collections,
    total: allRows.length,
    filtered: filtered.length,
    rows: filtered,
    facets: buildFacets(allRows),
  };
}
