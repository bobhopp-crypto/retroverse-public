import { NextResponse } from "next/server";

import { loadChartWeekContext } from "@/lib/charts/load-chart-week-context";
import { parseChartWeekDateParam } from "@/lib/charts/chart-week-portal-href";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseIntParam(raw: string | null): number | null {
  if (!raw?.trim()) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const chartDate = parseChartWeekDateParam(url.searchParams.get("date") ?? "");
  if (!chartDate) {
    return NextResponse.json({ ok: false, error: "Invalid date" }, { status: 400 });
  }

  const focus = url.searchParams.get("focus");
  const rank = parseIntParam(url.searchParams.get("rank"));
  const from = parseIntParam(url.searchParams.get("from"));
  const to = parseIntParam(url.searchParams.get("to"));
  const radius = parseIntParam(url.searchParams.get("radius"));

  const context = await loadChartWeekContext({
    chartDate,
    focusTrackId: focus,
    rankHint: rank,
    radius: radius ?? undefined,
    rangeFrom: from ?? undefined,
    rangeTo: to ?? undefined,
  });

  if (!context) {
    return NextResponse.json({ ok: false, error: "No chart week data" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, context });
}
