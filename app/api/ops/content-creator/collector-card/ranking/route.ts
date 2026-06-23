import { NextResponse } from "next/server";

import { inspectQuery } from "@/lib/inspect/pg";
import type { CollectorCardContent } from "@/lib/ops/content-creator/collector-card";
import {
  loadCollectorDeckState,
  lockCollectorDeckYear,
} from "@/lib/ops/content-creator/collector-deck-state";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RetroverseHot100Row = {
  graph_track_id: number;
  song: string;
  artist: string;
  rvtr: string | null;
  peak: number;
  weeks: number;
  first_chart_date: string | null;
  last_chart_date: string | null;
};

function parseYear(raw: string | null): number {
  const year = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(year) && year >= 1900 && year <= 2100 ? year : 1977;
}

function factFor(row: RetroverseHot100Row, rank: number, year: number): string {
  const peak = row.peak ? `peaked at #${row.peak}` : "charted";
  const weeks = row.weeks === 1 ? "1 chart week" : `${row.weeks} chart weeks`;
  return `Retroverse Hot 100 rank #${rank} for ${year}: ${peak} across ${weeks}.`;
}

async function loadLiveRanking(year: number): Promise<CollectorCardContent[]> {
  const rows = await inspectQuery<RetroverseHot100Row>(
    `
    WITH chart_raw AS (
      SELECT
        ca.chart_date,
        ca.chart_position,
        t.id AS graph_track_id,
        t.title AS song,
        ar.canonical_name AS artist,
        nullif(upper(trim(ctd.track_id)), '') AS rvtr,
        lower(regexp_replace(trim(ar.canonical_name), '\\s+', ' ', 'g')) AS artist_norm,
        lower(regexp_replace(trim(t.title), '\\s+', ' ', 'g')) AS title_norm,
        coalesce(
          nullif(upper(trim(ctd.track_id)), ''),
          'norm:' || lower(regexp_replace(trim(ar.canonical_name), '\\s+', ' ', 'g'))
            || '|' || lower(regexp_replace(trim(t.title), '\\s+', ' ', 'g'))
        ) AS song_key
      FROM chart_appearances ca
      JOIN tracks t ON t.id = ca.track_id
      JOIN artists ar ON ar.id = t.artist_id
      LEFT JOIN canonical_track_versions ctv
        ON ctv.graph_track_id = t.id AND ctv.is_primary IS TRUE
      LEFT JOIN canonical_tracks ct ON ct.id = ctv.canonical_track_id
      LEFT JOIN canonical_track_display ctd ON ctd.id = ct.id
      WHERE ca.chart_name = 'Billboard Hot 100'
        AND extract(year from ca.chart_date)::int = $1
    ),
    chart_agg AS (
      SELECT
        song_key,
        min(chart_position)::int AS peak,
        count(DISTINCT chart_date)::int AS weeks,
        min(chart_date)::text AS first_chart_date,
        max(chart_date)::text AS last_chart_date
      FROM chart_raw
      GROUP BY song_key
    ),
    chart_rep AS (
      SELECT DISTINCT ON (cr.song_key)
        cr.song_key,
        cr.graph_track_id,
        cr.song,
        cr.artist,
        cr.rvtr
      FROM chart_raw cr
      ORDER BY cr.song_key, cr.chart_position ASC NULLS LAST, cr.chart_date ASC
    )
    SELECT
      rep.graph_track_id,
      rep.song,
      rep.artist,
      rep.rvtr,
      agg.peak,
      agg.weeks,
      agg.first_chart_date,
      agg.last_chart_date
    FROM chart_rep rep
    JOIN chart_agg agg ON agg.song_key = rep.song_key
    ORDER BY agg.peak ASC NULLS LAST, agg.weeks DESC NULLS LAST, rep.song ASC
    LIMIT 10
    `,
    [year],
  );

  return rows.map((row, index) => ({
    year,
    song: row.song.trim(),
    artist: row.artist.trim(),
    rvtr: row.rvtr ?? "",
    chartPosition: index + 1,
    peak: row.peak,
    weeks: row.weeks,
    fact: factFor(row, index + 1, year),
  }));
}

export async function GET(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const url = new URL(req.url);
  const year = parseYear(url.searchParams.get("year"));
  const state = await loadCollectorDeckState();
  const locked = state.lockedYears[String(year)] ?? null;
  const liveCards = await loadLiveRanking(year);
  const cards = locked?.cards ?? liveCards;

  return NextResponse.json({
    ok: true,
    sourceName: "Retroverse Hot 100",
    year,
    locked,
    lockedAt: locked?.lockedAt ?? null,
    liveCards,
    cards,
  });
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const body = (await req.json()) as { year?: unknown; cards?: unknown };
  const year = typeof body.year === "number" ? body.year : parseYear(String(body.year ?? ""));
  const cards = Array.isArray(body.cards) ? (body.cards as CollectorCardContent[]) : await loadLiveRanking(year);
  const locked = await lockCollectorDeckYear({ year, cards });

  return NextResponse.json({
    ok: true,
    sourceName: "Retroverse Hot 100",
    year,
    locked,
    lockedAt: locked.lockedAt,
    cards: locked.cards,
  });
}
