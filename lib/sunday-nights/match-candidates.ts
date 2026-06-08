import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { resolveAlbumCoverUrlFromRow } from "@/lib/artwork/resolve-album-cover-url";

import { normalizeMatchText } from "./normalize-match-key";
import type { SundayMatchCandidate } from "./playlist-types";

export type { SundayMatchCandidate } from "./playlist-types";

type DisplayRow = {
  rvtr: string | null;
  canonical_title: string;
  canonical_artist_name: string;
  peak_hot100_position: number | null;
  first_chart_date: string | null;
  chart_weeks: number | null;
  has_hot100: boolean;
  cover_path: string | null;
  artwork_path: string | null;
  r2_cover_key: string | null;
};

type TierSpec = {
  id: string;
  reason: string;
};

const RE_RVTR = /^RVTR\d{6}$/i;
const STOP_WORDS = new Set(["the", "and", "for", "with", "from"]);

function cleanTitle(title: string): string {
  return title
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s*\[[^\]]*\]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripPunctuation(value: string): string {
  return value
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitleForSearch(title: string): string {
  return stripPunctuation(cleanTitle(title))
    .replace(/^the\s+/i, "")
    .trim();
}

function compactCompareKey(value: string): string {
  return normalizeMatchText(stripPunctuation(cleanTitle(value))).replace(/[^a-z0-9']/g, "");
}

function significantWords(text: string): string[] {
  return normalizeTitleForSearch(text)
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function titleVariants(title: string): string[] {
  const raw = title.trim();
  const core = cleanTitle(raw);
  const normalized = normalizeTitleForSearch(raw);
  const compact = compactCompareKey(raw);
  const variants = new Set<string>();
  if (raw) variants.add(raw);
  if (core && core !== raw) variants.add(core);
  if (normalized && normalized !== core) variants.add(normalized);
  if (compact) variants.add(compact);
  return [...variants];
}

function yearFromDate(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const year = Number(value.slice(0, 4));
  return Number.isFinite(year) && year > 0 ? year : null;
}

function mapRow(row: DisplayRow, tier: TierSpec): SundayMatchCandidate | null {
  const rvtr = row.rvtr?.trim().toUpperCase();
  if (!rvtr || !RE_RVTR.test(rvtr)) return null;
  const firstChartDate = row.first_chart_date?.trim() || null;
  const chartYear = yearFromDate(firstChartDate);
  const isCharted = Boolean(row.has_hot100 || row.peak_hot100_position != null || firstChartDate);
  return {
    rvtr,
    title: row.canonical_title.trim(),
    artistName: row.canonical_artist_name.trim(),
    peakHot100: row.peak_hot100_position,
    chartWeeks: row.chart_weeks ?? null,
    chartYear,
    firstChartDate,
    chartSource: row.has_hot100 ? "Billboard Hot 100" : null,
    isCharted,
    coverUrl: resolveAlbumCoverUrlFromRow({
      cover_path: row.cover_path,
      artwork_path: row.artwork_path,
      r2_cover_key: row.r2_cover_key,
    }),
    reason: tier.reason,
    tier: tier.id,
  };
}

function pushCandidates(
  rows: DisplayRow[],
  tier: TierSpec,
  seen: Set<string>,
  out: SundayMatchCandidate[],
  limit: number,
): void {
  for (const row of rows) {
    if (out.length >= limit) return;
    const candidate = mapRow(row, tier);
    if (!candidate || seen.has(candidate.rvtr)) continue;
    seen.add(candidate.rvtr);
    out.push(candidate);
  }
}

async function queryDisplay(
  sql: string,
  params: unknown[],
  limit: number,
): Promise<DisplayRow[]> {
  return inspectQuery<DisplayRow>(sql, [...params, limit]);
}

const SELECT_DISPLAY = `
  SELECT
    upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) AS rvtr,
    ctd.canonical_title,
    ctd.canonical_artist_name,
    ctd.peak_hot100_position,
    ctd.first_chart_date::text AS first_chart_date,
    ctd.chart_weeks,
    ctd.has_hot100,
    (
      SELECT al.canonical_cover_path
      FROM canonical_album_tracks cat
      JOIN albums al ON al.id = cat.album_id
      WHERE upper(trim(cat.canonical_track_key)) = upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id)))
      ORDER BY cat.position ASC
      LIMIT 1
    ) AS cover_path,
    (
      SELECT aal.canonical_cover_path
      FROM canonical_album_tracks cat
      JOIN album_artwork_links aal ON aal.album_id = cat.album_id
      WHERE upper(trim(cat.canonical_track_key)) = upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id)))
      ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST, cat.position ASC
      LIMIT 1
    ) AS artwork_path,
    (
      SELECT aal.r2_cover_key
      FROM canonical_album_tracks cat
      JOIN album_artwork_links aal ON aal.album_id = cat.album_id
      WHERE upper(trim(cat.canonical_track_key)) = upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id)))
      ORDER BY (aal.review_flag IN ('curated', 'ok')) DESC, aal.confidence_score DESC NULLS LAST, cat.position ASC
      LIMIT 1
    ) AS r2_cover_key
  FROM canonical_track_display ctd
`;

const ORDER_DISPLAY = `
  ORDER BY
    ctd.has_hot100 DESC,
    ctd.peak_hot100_position ASC NULLS LAST,
    ctd.chart_weeks DESC,
    ctd.canonical_title ASC
  LIMIT $LIMIT
`;

async function tierExactNormalized(
  artist: string,
  title: string,
  limit: number,
): Promise<DisplayRow[]> {
  const titleCore = cleanTitle(title);
  const compactTitle = compactCompareKey(title);
  return queryDisplay(
    `
    ${SELECT_DISPLAY}
    WHERE ctd.canonical_artist_name ILIKE $1
      AND (
        ctd.canonical_title ILIKE $2
        OR ctd.canonical_title ILIKE $3
        OR ctd.canonical_title ILIKE $4
        OR regexp_replace(
          regexp_replace(lower(trim(ctd.canonical_title)), '[^a-z0-9'']', '', 'g'),
          '\\s+', '', 'g'
        ) = $5
      )
    ${ORDER_DISPLAY.replace("$LIMIT", "$6")}
    `,
    [`%${artist.trim()}%`, title.trim(), `%${titleCore}%`, `%${title.trim()}%`, compactTitle],
    limit,
  );
}

async function tierTitleOnly(title: string, limit: number): Promise<DisplayRow[]> {
  const variants = titleVariants(title);
  const compactTitle = compactCompareKey(title);
  const ilikeClauses = variants.map((_, index) => `ctd.canonical_title ILIKE $${index + 1}`);
  const params: unknown[] = variants.map((variant) => `%${variant}%`);
  params.push(compactTitle);
  const compactParam = `$${params.length}`;

  return queryDisplay(
    `
    ${SELECT_DISPLAY}
    WHERE (
      ${ilikeClauses.join(" OR ")}
      OR regexp_replace(
        regexp_replace(lower(trim(ctd.canonical_title)), '[^a-z0-9'']', '', 'g'),
        '\\s+', '', 'g'
      ) = ${compactParam}
    )
    ${ORDER_DISPLAY.replace("$LIMIT", `$${params.length + 1}`)}
    `,
    params,
    limit,
  );
}

async function tierFuzzyTitle(title: string, limit: number): Promise<DisplayRow[]> {
  const words = significantWords(title);
  if (words.length === 0) return [];

  const clauses = words.map((_, index) => `ctd.canonical_title ILIKE $${index + 1}`);
  const params = words.map((word) => `%${word}%`);

  return queryDisplay(
    `
    ${SELECT_DISPLAY}
    WHERE ${clauses.join(" AND ")}
    ${ORDER_DISPLAY.replace("$LIMIT", `$${params.length + 1}`)}
    `,
    params,
    limit,
  );
}

async function tierArtistRelaxed(artist: string, title: string, limit: number): Promise<DisplayRow[]> {
  const words = significantWords(title);
  if (words.length === 0) return [];

  const wordClauses = words.map((_, index) => `ctd.canonical_title ILIKE $${index + 1}`);
  const params = words.map((word) => `%${word}%`);
  params.push(`%${artist.trim()}%`);
  const artistParam = `$${params.length}`;

  return queryDisplay(
    `
    ${SELECT_DISPLAY}
    WHERE ${wordClauses.join(" AND ")}
      AND ctd.canonical_artist_name ILIKE ${artistParam}
    ${ORDER_DISPLAY.replace("$LIMIT", `$${params.length + 1}`)}
    `,
    params,
    limit,
  );
}

async function tierCommonTitleFallback(title: string, limit: number): Promise<DisplayRow[]> {
  const normalized = normalizeTitleForSearch(title);
  if (!normalized || normalized.length < 4) return [];

  const shortCore = normalized.split(/\s+/).slice(-4).join(" ");
  if (!shortCore || shortCore === normalized) {
    return queryDisplay(
      `
      ${SELECT_DISPLAY}
      WHERE ctd.canonical_title ILIKE $1
      ${ORDER_DISPLAY.replace("$LIMIT", "$2")}
      `,
      [`%${normalized}%`],
      limit,
    );
  }

  return queryDisplay(
    `
    ${SELECT_DISPLAY}
    WHERE ctd.canonical_title ILIKE $1
       OR ctd.canonical_title ILIKE $2
    ${ORDER_DISPLAY.replace("$LIMIT", "$3")}
    `,
    [`%${normalized}%`, `%${shortCore}%`],
    limit,
  );
}

async function tierByRvtr(rvtr: string): Promise<DisplayRow[]> {
  return queryDisplay(
    `
    ${SELECT_DISPLAY}
    WHERE upper(trim(ctd.track_id)) = upper(trim($1))
       OR upper(trim(coalesce(ctd.retroverse_track_id, ''))) = upper(trim($1))
    ${ORDER_DISPLAY.replace("$LIMIT", "$2")}
    `,
    [rvtr.toUpperCase()],
    1,
  );
}

export async function searchMatchManual(
  query: string,
  limit = 12,
): Promise<SundayMatchCandidate[]> {
  const ping = await inspectPing();
  if (!ping.ok) return [];

  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const tier: TierSpec = { id: "manual", reason: "Manual search" };
  const seen = new Set<string>();
  const out: SundayMatchCandidate[] = [];

  if (RE_RVTR.test(trimmed)) {
    const rows = await tierByRvtr(trimmed.toUpperCase());
    pushCandidates(rows, tier, seen, out, limit);
    return out;
  }

  const rows = await queryDisplay(
    `
    ${SELECT_DISPLAY}
    WHERE ctd.canonical_artist_name ILIKE $1
       OR ctd.canonical_title ILIKE $1
       OR (ctd.canonical_artist_name || ' ' || ctd.canonical_title) ILIKE $1
    ${ORDER_DISPLAY.replace("$LIMIT", "$2")}
    `,
    [`%${trimmed}%`],
    limit,
  );
  pushCandidates(rows, tier, seen, out, limit);

  if (out.length < limit) {
    const fuzzyRows = await tierFuzzyTitle(trimmed, limit);
    pushCandidates(fuzzyRows, { id: "manual-fuzzy", reason: "Manual fuzzy title" }, seen, out, limit);
  }

  return out;
}

export async function loadMatchCandidates(
  artist: string,
  title: string,
  limit = 12,
): Promise<SundayMatchCandidate[]> {
  const ping = await inspectPing();
  if (!ping.ok) return [];

  const artistNeedle = artist.trim();
  const titleNeedle = title.trim();
  if (!artistNeedle || !titleNeedle) return [];

  const seen = new Set<string>();
  const out: SundayMatchCandidate[] = [];

  const tiers: Array<{
    tier: TierSpec;
    run: () => Promise<DisplayRow[]>;
  }> = [
    {
      tier: { id: "A", reason: "Exact normalized title + artist" },
      run: () => tierExactNormalized(artistNeedle, titleNeedle, limit),
    },
    {
      tier: { id: "B", reason: "Normalized title match" },
      run: () => tierTitleOnly(titleNeedle, limit),
    },
    {
      tier: { id: "C", reason: "Fuzzy title words" },
      run: () => tierFuzzyTitle(titleNeedle, limit),
    },
    {
      tier: { id: "D", reason: "Artist-relaxed title words" },
      run: () => tierArtistRelaxed(artistNeedle, titleNeedle, limit),
    },
    {
      tier: { id: "E", reason: "Common title variant" },
      run: () => tierCommonTitleFallback(titleNeedle, limit),
    },
  ];

  for (const step of tiers) {
    if (out.length >= limit) break;
    const rows = await step.run();
    pushCandidates(rows, step.tier, seen, out, limit);
  }

  return out;
}
