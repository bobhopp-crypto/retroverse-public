import { NextResponse } from "next/server";

import { isOpsEnabled } from "@/lib/ops/ops-gate";
import {
  searchVdjVideoLibrary,
  VDJ_SEARCH_MAX_RESULTS,
  VDJ_SEARCH_MIN_QUERY_LEN,
} from "@/lib/ops/load-vdj-search";
import { inspectPing } from "@/lib/inspect/pg";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  }

  const ping = await inspectPing();
  if (!ping.ok) {
    return NextResponse.json(
      { ok: false, error: ping.error ?? "Postgres offline", results: [] },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";

  if (q.length < VDJ_SEARCH_MIN_QUERY_LEN) {
    return NextResponse.json({
      ok: true,
      results: [],
      limit: VDJ_SEARCH_MAX_RESULTS,
      minQueryLength: VDJ_SEARCH_MIN_QUERY_LEN,
    });
  }

  const results = await searchVdjVideoLibrary(q);
  return NextResponse.json({
    ok: true,
    results,
    limit: VDJ_SEARCH_MAX_RESULTS,
    minQueryLength: VDJ_SEARCH_MIN_QUERY_LEN,
  });
}
