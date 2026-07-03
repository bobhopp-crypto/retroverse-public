import { NextResponse } from "next/server";

import { searchSundayNightsUnified } from "@/lib/sunday-nights/unified-search";
import type { SundayYearFilter } from "@/lib/sunday-nights/playlist-types";
import { SUNDAY_EVENT_YEARS } from "@/lib/sunday-nights/playlist-types";

export const dynamic = "force-dynamic";

function parseYearFilter(raw: string | null): SundayYearFilter {
  if (raw === "all") return "all";
  const y = Number(raw);
  if (SUNDAY_EVENT_YEARS.includes(y as (typeof SUNDAY_EVENT_YEARS)[number])) {
    return y as (typeof SUNDAY_EVENT_YEARS)[number];
  }
  return 1967;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q")?.trim() ?? "";
    const yearFilter = parseYearFilter(url.searchParams.get("year"));

    if (query.length < 2) {
      return NextResponse.json({ hits: [] });
    }

    const hits = await searchSundayNightsUnified({ query, yearFilter });
    return NextResponse.json({ hits });
  } catch (err) {
    console.error("[ops/sunday-nights/search GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 500 },
    );
  }
}
