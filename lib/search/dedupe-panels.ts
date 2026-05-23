import { normalizeArtistMatchKey } from "./canonicalize-search";
import { normalizeDedupeKey } from "./display-format";
import type { HomeSearchPayload } from "./home-search-types";
import type { ArtistChartResult, SearchPanels } from "./types";

function pickPreferredArtistName(
  a: string,
  b: string,
  preferredCanonical?: string | null,
): string {
  if (preferredCanonical) {
    const key = normalizeArtistMatchKey(preferredCanonical);
    const aKey = normalizeArtistMatchKey(a);
    const bKey = normalizeArtistMatchKey(b);
    if (aKey === key && bKey !== key) return a;
    if (bKey === key && aKey !== key) return b;
    if (a.toLowerCase() === preferredCanonical.toLowerCase()) return a;
    if (b.toLowerCase() === preferredCanonical.toLowerCase()) return b;
  }
  return a.length >= b.length ? a : b;
}

function albumEntityKey(
  row: HomeSearchPayload["albums"][number],
): string {
  return `${normalizeArtistMatchKey(row.artist)}::${normalizeDedupeKey(row.title)}`;
}

function trackEntityKey(
  row: HomeSearchPayload["tracks"][number],
): string {
  return `${normalizeArtistMatchKey(row.artist)}::${normalizeDedupeKey(row.title)}`;
}

/** Ensure React keys are unique even if upstream hrefs repeat. */
export function dedupeByPanelId<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    let id = item.id;
    let suffix = 0;
    while (seen.has(id)) {
      suffix += 1;
      id = `${item.id}::${suffix}`;
    }
    seen.add(id);
    out.push(suffix === 0 ? item : { ...item, id });
  }

  return out;
}

export function panelEntityId(
  kind: string,
  index: number,
  href: string,
  fallback: string,
): string {
  const base = href.trim() || `${kind}-${fallback}-${index}`;
  return `${kind}-${index}-${base}`;
}

export function dedupeHomeSearchArtists(
  rows: HomeSearchPayload["artists"],
  preferredCanonical?: string | null,
): HomeSearchPayload["artists"] {
  const byKey = new Map<string, HomeSearchPayload["artists"][number]>();
  for (const row of rows) {
    const matchKey = normalizeArtistMatchKey(row.name);
    const key = matchKey || row.href.trim() || normalizeDedupeKey(row.name);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, row);
      continue;
    }
    byKey.set(key, {
      ...row,
      name: pickPreferredArtistName(prev.name, row.name, preferredCanonical),
      href: prev.href.trim() ? prev.href : row.href,
    });
  }
  return [...byKey.values()];
}

export function dedupeHomeSearchAlbums(
  rows: HomeSearchPayload["albums"],
): HomeSearchPayload["albums"] {
  const byKey = new Map<string, HomeSearchPayload["albums"][number]>();
  for (const row of rows) {
    const key = row.href.trim() || albumEntityKey(row);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, row);
      continue;
    }
    const year =
      row.year != null && row.year > 0
        ? row.year
        : prev.year != null && prev.year > 0
          ? prev.year
          : null;
    byKey.set(key, { ...prev, year: year ?? prev.year });
  }
  return [...byKey.values()];
}

export function dedupeHomeSearchTracks(
  rows: HomeSearchPayload["tracks"],
): HomeSearchPayload["tracks"] {
  const byKey = new Map<string, HomeSearchPayload["tracks"][number]>();
  for (const row of rows) {
    const key = row.href.trim() || trackEntityKey(row);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, row);
      continue;
    }
    const year =
      typeof row.year === "number" && row.year > 0
        ? row.year
        : typeof prev.year === "number" && prev.year > 0
          ? prev.year
          : prev.year;
    byKey.set(key, { ...prev, year: year ?? prev.year });
  }
  return [...byKey.values()];
}

export function dedupeSearchArtistPanels(
  rows: ArtistChartResult[],
  preferredCanonical?: string | null,
): ArtistChartResult[] {
  const charts = rows.filter((r) => r.kind === "chart");
  const byKey = new Map<string, ArtistChartResult>();
  for (const row of rows) {
    if (row.kind !== "artist") continue;
    const key = normalizeArtistMatchKey(row.title);
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, row);
      continue;
    }
    byKey.set(key, {
      ...row,
      title: pickPreferredArtistName(prev.title, row.title, preferredCanonical),
      artistHref: prev.artistHref ?? row.artistHref,
    });
  }
  return [...byKey.values(), ...charts];
}

export function dedupeSearchPanels(
  panels: SearchPanels,
  preferredCanonical?: string | null,
): SearchPanels {
  const albumsByKey = new Map<string, (typeof panels.albums)[number]>();
  for (const row of panels.albums) {
    const key = `${normalizeArtistMatchKey(row.artist)}::${normalizeDedupeKey(row.title)}`;
    const prev = albumsByKey.get(key);
    if (!prev) {
      albumsByKey.set(key, row);
      continue;
    }
    const year =
      row.year > 0 ? row.year : prev.year > 0 ? prev.year : 0;
    albumsByKey.set(key, { ...prev, year });
  }

  const songsByKey = new Map<string, (typeof panels.songs)[number]>();
  for (const row of panels.songs) {
    const key = `${normalizeArtistMatchKey(row.artist)}::${normalizeDedupeKey(row.title)}`;
    const prev = songsByKey.get(key);
    if (!prev) {
      songsByKey.set(key, row);
      continue;
    }
    const year = row.year > 0 ? row.year : prev.year > 0 ? prev.year : 0;
    songsByKey.set(key, { ...prev, year });
  }

  return {
    albums: [...albumsByKey.values()],
    songs: [...songsByKey.values()],
    artistsCharts: dedupeSearchArtistPanels(panels.artistsCharts, preferredCanonical),
  };
}

export function dedupeHomeSearchCharts(
  rows: HomeSearchPayload["charts"],
): HomeSearchPayload["charts"] {
  const seen = new Set<string>();
  const out: HomeSearchPayload["charts"] = [];
  for (const row of rows) {
    const key =
      row.href.trim() ||
      normalizeDedupeKey(row.label, String(row.year), row.weekDate);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}
