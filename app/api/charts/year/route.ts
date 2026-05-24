import { NextResponse } from "next/server";

import { isUsableChartHistory } from "@/lib/artist/chart-history";
import { loadRvYearChartHistory } from "@/lib/artist/load-chart-history";
import { normalizeRVYear } from "@/lib/search/normalize-rv-year";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rvYear = normalizeRVYear(url.searchParams.get("year"));
  if (rvYear == null) {
    return NextResponse.json({ ok: false, error: "Invalid year" }, { status: 400 });
  }

  const history = await loadRvYearChartHistory(rvYear);
  if (!history || !isUsableChartHistory(history)) {
    return NextResponse.json({ ok: false, error: "No chart data for year" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, year: rvYear, history });
}
