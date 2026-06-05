import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

import { loadSundayEventSongs } from "./load-playlist";
import { normalizeMatchText } from "./normalize-match-key";
import {
  aliasesMatchingQuery,
  loadRvtrAliasStore,
  lookupAliasRvtrFromStore,
} from "./rvtr-aliases";
import type { SundayYearFilter } from "./playlist-types";
import { useSundayNightsSnapshots } from "./storage-mode";

export type SundaySearchSource = "mylist" | "retroverse" | "vdj-xml" | "alias";

export type SundaySearchHit = {
  id: string;
  source: SundaySearchSource;
  artist: string;
  title: string;
  rvtr: string | null;
  year: number | null;
  path: string | null;
  songKey: string | null;
  detail: string | null;
};

const RE_RVTR = /^RVTR\d{6}$/i;
const MIN_QUERY_LEN = 2;
const MAX_PER_SOURCE = 12;

type CatalogRow = {
  rvtr: string | null;
  canonical_title: string;
  canonical_artist_name: string;
  first_chart_date: string | null;
};

type VdjRow = {
  source_path: string | null;
  directory_path: string | null;
  filename: string | null;
  artist_text: string | null;
  title_text: string | null;
  year_text: string | null;
  rvtr: string | null;
};

function yearFromDate(raw: string | null): number | null {
  if (!raw?.trim()) return null;
  const y = Number.parseInt(raw.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

function vdjPath(row: VdjRow): string {
  if (row.source_path?.trim()) return row.source_path.trim();
  if (row.directory_path?.trim() && row.filename?.trim()) {
    return `${row.directory_path.replace(/\/+$/, "")}/${row.filename}`;
  }
  return row.filename?.trim() || "—";
}

function queryMatches(needle: string, ...fields: string[]): boolean {
  const q = normalizeMatchText(needle);
  if (!q) return false;
  return fields.some((field) => normalizeMatchText(field).includes(q));
}

async function searchRetroverse(query: string): Promise<SundaySearchHit[]> {
  const ping = await inspectPing();
  if (!ping.ok) return [];

  const trimmed = query.trim();
  const isRvtr = RE_RVTR.test(trimmed);

  const rows = isRvtr
    ? await inspectQuery<CatalogRow>(
        `
        SELECT
          upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) AS rvtr,
          ctd.canonical_title,
          ctd.canonical_artist_name,
          ctd.first_chart_date::text AS first_chart_date
        FROM canonical_track_display ctd
        WHERE upper(trim(ctd.track_id)) = upper(trim($1))
           OR upper(trim(coalesce(ctd.retroverse_track_id, ''))) = upper(trim($1))
        LIMIT $2
        `,
        [trimmed.toUpperCase(), MAX_PER_SOURCE],
      )
    : await inspectQuery<CatalogRow>(
        `
        SELECT
          upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) AS rvtr,
          ctd.canonical_title,
          ctd.canonical_artist_name,
          ctd.first_chart_date::text AS first_chart_date
        FROM canonical_track_display ctd
        WHERE ctd.canonical_artist_name ILIKE $1
           OR ctd.canonical_title ILIKE $1
           OR upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) ILIKE $1
        ORDER BY
          ctd.has_hot100 DESC,
          ctd.peak_hot100_position ASC NULLS LAST,
          ctd.chart_weeks DESC,
          ctd.canonical_title ASC
        LIMIT $2
        `,
        [`%${trimmed}%`, MAX_PER_SOURCE],
      );

  return rows.map((row) => ({
    id: `rv-${row.rvtr ?? row.canonical_title}`,
    source: "retroverse" as const,
    artist: row.canonical_artist_name.trim(),
    title: row.canonical_title.trim(),
    rvtr: row.rvtr?.trim().toUpperCase() ?? null,
    year: yearFromDate(row.first_chart_date),
    path: null,
    songKey: null,
    detail: "Retroverse",
  }));
}

async function searchVdjXml(query: string): Promise<SundaySearchHit[]> {
  const ping = await inspectPing();
  if (!ping.ok) return [];

  const rows = await inspectQuery<VdjRow>(
    `
    SELECT
      ma.source_path,
      ma.directory_path,
      ma.filename,
      ma.artist_text,
      ma.title_text,
      ma.year_text,
      (
        SELECT upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id)))
        FROM media_track_links mtl
        JOIN canonical_track_display ctd ON ctd.track_id::text = mtl.track_id::text
        WHERE mtl.media_asset_id = ma.id
        ORDER BY mtl.confidence_score DESC NULLS LAST
        LIMIT 1
      ) AS rvtr
    FROM media_assets ma
    WHERE (
      lower(coalesce(ma.artist_text, '')) LIKE '%' || lower($1) || '%'
      OR lower(coalesce(ma.title_text, '')) LIKE '%' || lower($1) || '%'
      OR lower(coalesce(ma.filename, '')) LIKE '%' || lower($1) || '%'
    )
    ORDER BY ma.updated_at DESC NULLS LAST
    LIMIT $2
    `,
    [query.trim().slice(0, 80), MAX_PER_SOURCE],
  );

  return rows.map((row) => {
    const rvtr = row.rvtr?.trim().toUpperCase() ?? null;
    const path = vdjPath(row);
    return {
      id: `vdj-${path}`,
      source: "vdj-xml" as const,
      artist: row.artist_text?.trim() || "Unknown artist",
      title: row.title_text?.trim() || row.filename?.trim() || "Untitled",
      rvtr,
      year: row.year_text ? Number.parseInt(row.year_text, 10) || null : null,
      path,
      songKey: null,
      detail: rvtr ? "VirtualDJ" : "XML ONLY",
    };
  });
}

async function searchAliases(query: string): Promise<SundaySearchHit[]> {
  const store = await loadRvtrAliasStore();
  const matches = aliasesMatchingQuery(store, query).slice(0, MAX_PER_SOURCE);
  if (matches.length === 0) return [];

  const ping = await inspectPing();
  const out: SundaySearchHit[] = [];

  for (const alias of matches) {
    let title = alias.title;
    let artist = alias.artist;
    let year: number | null = null;

    if (ping.ok) {
      const rows = await inspectQuery<CatalogRow>(
        `
        SELECT
          ctd.canonical_title,
          ctd.canonical_artist_name,
          ctd.first_chart_date::text AS first_chart_date
        FROM canonical_track_display ctd
        WHERE upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) = upper(trim($1))
        LIMIT 1
        `,
        [alias.rvtr],
      );
      if (rows[0]) {
        title = rows[0].canonical_title.trim();
        artist = rows[0].canonical_artist_name.trim();
        year = yearFromDate(rows[0].first_chart_date);
      }
    }

    out.push({
      id: `alias-${alias.rvtr}-${alias.title}`,
      source: "alias",
      artist,
      title,
      rvtr: alias.rvtr,
      year,
      path: alias.path,
      songKey: null,
      detail: `Alias → ${alias.title}`,
    });
  }

  return out;
}

export async function searchSundayNightsUnified(input: {
  query: string;
  yearFilter: SundayYearFilter;
}): Promise<SundaySearchHit[]> {
  const query = input.query.trim();
  if (query.length < MIN_QUERY_LEN) return [];

  const productionMode = useSundayNightsSnapshots();
  const aliasStore = productionMode
    ? { version: 1 as const, aliases: {}, updatedAt: new Date().toISOString() }
    : await loadRvtrAliasStore();
  const [retroverse, vdjXml, aliasHits, allMylistEvent] = await Promise.all([
    searchRetroverse(query),
    productionMode ? Promise.resolve([]) : searchVdjXml(query),
    productionMode ? Promise.resolve([]) : searchAliases(query),
    loadSundayEventSongs("all"),
  ]);

  const mylistHits: SundaySearchHit[] = [];
  for (const song of allMylistEvent.songs) {
    const aliasRvtr = lookupAliasRvtrFromStore(aliasStore, song.artist, song.title);
    const rvtr = song.rvtr ?? aliasRvtr;
    if (
      !queryMatches(query, song.artist, song.title, rvtr ?? "", song.path) &&
      !queryMatches(query, song.artist, song.title)
    ) {
      continue;
    }
    mylistHits.push({
      id: `mylist-${song.key}`,
      source: "mylist",
      artist: song.artist,
      title: song.title,
      rvtr,
      year: song.year,
      path: song.path,
      songKey: song.key,
      detail: productionMode ? "Snapshot" : "MyList",
    });
    if (mylistHits.length >= MAX_PER_SOURCE) break;
  }

  const seen = new Set<string>();
  const merged: SundaySearchHit[] = [];

  function push(hit: SundaySearchHit) {
    const dedupeKey = hit.rvtr
      ? `rvtr:${hit.rvtr}`
      : hit.path
        ? `path:${hit.path}`
        : `${hit.source}:${hit.artist}:${hit.title}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    merged.push(hit);
  }

  for (const hit of aliasHits) push(hit);
  for (const hit of mylistHits) push(hit);
  for (const hit of retroverse) push(hit);
  for (const hit of vdjXml) {
    if (hit.detail === "XML ONLY" || !hit.rvtr) push(hit);
    else if (!seen.has(`rvtr:${hit.rvtr}`)) push(hit);
  }

  return merged.slice(0, 30);
}
