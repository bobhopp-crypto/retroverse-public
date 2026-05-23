import { NextResponse } from "next/server";

import { welcomeUpstreamBase } from "@/lib/control-center/welcome-base";
import { EMPTY_SEARCH_PANELS } from "@/lib/search/empty-panels";
import {
  buildSearchNormalization,
  logSearchCanonical,
} from "@/lib/search/build-search-normalization";
import {
  canonicalSearchQueryDisplay,
  mapHomeSearchToPanels,
  normalizeHomeSearchPayload,
} from "@/lib/search/map-home-search";
import { detectYearContext } from "@/lib/search/detect-year-context";
import { loadSearchChartHistory } from "@/lib/search/load-search-chart-history";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({
      ok: true,
      q,
      panels: EMPTY_SEARCH_PANELS,
      chartHistory: null,
    });
  }

  const preNorm = await buildSearchNormalization(q);
  logSearchCanonical({
    ...preNorm.log,
    matchedArtistCount: 0,
    matchedSongCount: 0,
    matchedAlbumCount: 0,
  });
  const upstreamQ = preNorm.upstreamQuery;
  const upstreamBase = welcomeUpstreamBase().replace(/\/$/, "");
  if (!upstreamBase) {
    return NextResponse.json(
      {
        ok: false,
        q,
        panels: EMPTY_SEARCH_PANELS,
        chartHistory: null,
        error: "SEARCH_UPSTREAM_BASE_URL not configured",
      },
      { status: 503 },
    );
  }

  const upstream = `${upstreamBase}/api/home-search?q=${encodeURIComponent(upstreamQ)}`;

  try {
    const res = await fetch(upstream, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn("[search:proxy]", { q, upstream, status: res.status });
      return NextResponse.json(
        {
          ok: false,
          q,
          panels: EMPTY_SEARCH_PANELS,
          chartHistory: null,
          error: `Upstream search returned ${res.status}`,
        },
        { status: 502 },
      );
    }

    const raw = await res.json();
    const payload = normalizeHomeSearchPayload(raw, q);
    const panels = mapHomeSearchToPanels(
      payload,
      preNorm.resolved?.canonicalName ?? null,
    );

    const queryDisplay = canonicalSearchQueryDisplay(
      preNorm.resolved?.canonicalName ?? null,
      q,
    );
    logSearchCanonical({
      ...preNorm.log,
      matchedArtistCount: payload.artists.length,
      matchedSongCount: panels.songs.length,
      matchedAlbumCount: panels.albums.length,
    });
    let chartHistory = null;
    const yearContext = detectYearContext(q);
    if (yearContext.hasYear) {
      try {
        chartHistory = await loadSearchChartHistory(q, panels);
      } catch (chartErr) {
        console.warn("[search:rv-history]", chartErr);
      }
    }

    return NextResponse.json({
      ok: true,
      q: payload.q,
      queryDisplay,
      canonicalArtist: preNorm.resolved?.canonicalName ?? null,
      panels,
      chartHistory,
      incomplete: payload.incomplete,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn("[search:proxy]", { q, upstream, message });
    return NextResponse.json(
      {
        ok: false,
        q,
        panels: EMPTY_SEARCH_PANELS,
        chartHistory: null,
        error: message,
      },
      { status: 502 },
    );
  }
}
