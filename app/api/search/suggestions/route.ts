import { NextResponse } from "next/server";

import { welcomeUpstreamBase } from "@/lib/control-center/welcome-base";
import { buildSearchNormalization } from "@/lib/search/build-search-normalization";
import {
  buildHomeSearchSuggestions,
  suggestionGroupCount,
} from "@/lib/search/build-home-suggestions";
import { normalizeHomeSearchPayload } from "@/lib/search/map-home-search";
import { buildRvYearIntentSuggestions } from "@/lib/rv-year/rv-year-intent";
import {
  shouldUseCanonicalSuggestionContext,
  suggestionBreadthTier,
  upstreamQueryForSuggestions,
} from "@/lib/search/suggestion-scoring";
import { EMPTY_SUGGESTION_GROUPS } from "@/lib/search/search-suggestion-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({
      ok: true,
      q,
      suggestions: EMPTY_SUGGESTION_GROUPS,
      total: 0,
      canonicalArtist: null,
      rvYearIntent: false,
    });
  }

  const yearIntent = buildRvYearIntentSuggestions(q);
  if (yearIntent) {
    return NextResponse.json({
      ok: true,
      q,
      suggestions: yearIntent,
      total: 1,
      canonicalArtist: null,
      rvYearIntent: true,
    });
  }

  const breadth = suggestionBreadthTier(q.length);
  const preNorm = shouldUseCanonicalSuggestionContext(q)
    ? await buildSearchNormalization(q)
    : null;
  const upstreamQ = upstreamQueryForSuggestions(
    q,
    preNorm?.resolved?.canonicalName ?? null,
  );
  const upstreamBase = welcomeUpstreamBase().replace(/\/$/, "");
  if (!upstreamBase) {
    return NextResponse.json(
      {
        ok: false,
        q,
        suggestions: EMPTY_SUGGESTION_GROUPS,
        total: 0,
        canonicalArtist: preNorm?.resolved?.canonicalName ?? null,
        error: "SEARCH_UPSTREAM_BASE_URL not configured",
      },
      { status: 503 },
    );
  }

  const upstream = `${upstreamBase}/api/home-search?q=${encodeURIComponent(upstreamQ)}&limit=48`;

  try {
    const res = await fetch(upstream, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn("[search-suggestions]", { q, status: res.status });
      return NextResponse.json(
        {
          ok: false,
          q,
          suggestions: EMPTY_SUGGESTION_GROUPS,
          total: 0,
          canonicalArtist: preNorm?.resolved?.canonicalName ?? null,
          error: `Upstream returned ${res.status}`,
        },
        { status: 502 },
      );
    }

    const raw = await res.json();
    const payload = normalizeHomeSearchPayload(raw, q);
    const suggestions = buildHomeSearchSuggestions(
      payload,
      q,
      preNorm?.resolved?.canonicalName ?? null,
    );
    const total = suggestionGroupCount(suggestions);

    console.log("[search-suggestions]", {
      q,
      breadth,
      upstreamQ,
      canonicalArtist: preNorm?.resolved?.canonicalName ?? null,
      total,
      artists: suggestions.artists.length,
      songs: suggestions.songs.length,
      albums: suggestions.albums.length,
      years: suggestions.years.length,
    });

    return NextResponse.json({
      ok: true,
      q,
      suggestions,
      total,
      canonicalArtist: preNorm?.resolved?.canonicalName ?? null,
      rvYearIntent: false,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn("[search-suggestions]", { q, message });
    return NextResponse.json(
      {
        ok: false,
        q,
        suggestions: EMPTY_SUGGESTION_GROUPS,
        total: 0,
        canonicalArtist: preNorm?.resolved?.canonicalName ?? null,
        error: message,
      },
      { status: 502 },
    );
  }
}
