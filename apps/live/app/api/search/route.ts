import { NextResponse } from "next/server";

import { curateCatalogSearch } from "@/lib/search/curate-catalog-search";
import { entitiesToSuggestionGroups } from "@/lib/search/entities-to-suggestions";
import { querySearchEntities } from "@/lib/search/query-search-entities";
import {
  EMPTY_CURATED_SEARCH_GROUPS,
  EMPTY_SUGGESTION_GROUPS,
  type CuratedSearchGroups,
  type SearchSuggestionGroups,
} from "@/lib/search/search-suggestion-types";
import { yearSuggestionHref } from "@/lib/search/entity-routes";
import { resolveRvYearOnlyQuery } from "@/lib/rv-year/rv-year-intent";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function total(groups: SearchSuggestionGroups): number {
  return groups.artists.length + groups.songs.length + groups.albums.length + groups.years.length;
}

function curatedTotal(groups: CuratedSearchGroups): number {
  return (
    groups.bestMatch.length +
    groups.artists.length +
    groups.popularSongs.length +
    groups.albums.length +
    groups.otherMatches.length
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const traceEnabled = process.env.NODE_ENV !== "production" && url.searchParams.get("trace") === "1";
  const startedAt = performance.now();
  const trace = (resolverPath: string[], entitySource: string) =>
    traceEnabled
      ? {
          resolverPath,
          discoverySources: [`search-results: ${entitySource} canonical IDs`],
          loaderTimings: [
            {
              name: "canonical-search",
              durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
            },
          ],
        }
      : undefined;

  if (q.length < 2) {
    return NextResponse.json({
      ok: true,
      q,
      suggestions: EMPTY_SUGGESTION_GROUPS,
      curated: EMPTY_CURATED_SEARCH_GROUPS,
      total: 0,
    });
  }

  const year = resolveRvYearOnlyQuery(q);
  if (year != null) {
    const suggestions: SearchSuggestionGroups = {
      ...EMPTY_SUGGESTION_GROUPS,
      years: [
        {
          id: `year-${year}`,
          kind: "year",
          title: String(year),
          artist: null,
          year,
          coverUrl: null,
          label: String(year),
          href: yearSuggestionHref(year),
          routeQuery: String(year),
        },
      ],
    };
    const curated: CuratedSearchGroups = {
      ...EMPTY_CURATED_SEARCH_GROUPS,
      bestMatch: suggestions.years,
    };
    return NextResponse.json({
      ok: true,
      q,
      suggestions,
      curated,
      total: 1,
      trace: trace([`query:${q}`, `canonical_year:${year}`, "render"], "canonical year"),
    });
  }

  try {
    const { entities, meta } = await querySearchEntities(q, { mode: "full" });
    const suggestions = entitiesToSuggestionGroups(entities);
    const curated = await curateCatalogSearch(q, entities);
    return NextResponse.json({
      ok: true,
      q,
      suggestions,
      curated,
      total: curatedTotal(curated),
      candidateTotal: total(suggestions),
      index: meta,
      trace: trace(
        [`query:${q}`, `canonical_candidates:${entities.length}`, "canonical IDs", "render"],
        `${meta.entitySource} search source`,
      ),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[catalog-search]", { q, message });
    return NextResponse.json(
      {
        ok: false,
        q,
        suggestions: EMPTY_SUGGESTION_GROUPS,
        curated: EMPTY_CURATED_SEARCH_GROUPS,
        total: 0,
        error: message,
      },
      { status: 503 },
    );
  }
}
