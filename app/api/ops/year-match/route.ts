import { NextResponse } from "next/server";

import { OPS_FOCUS_YEAR } from "@/lib/ops/load-ops-data";
import {
  loadYearMatchSection,
  yearMatchStats,
} from "@/lib/ops/load-year-match-section";
import { inspectPing } from "@/lib/inspect/pg";

export const dynamic = "force-dynamic";

export async function GET() {
  const ping = await inspectPing();
  if (!ping.ok) {
    return NextResponse.json(
      { error: ping.error ?? "Postgres offline", yearMatch: [] },
      { status: 503 },
    );
  }

  const year = OPS_FOCUS_YEAR;
  const yearMatch = await loadYearMatchSection(year);
  return NextResponse.json({
    year,
    yearMatch,
    yearStats: yearMatchStats(yearMatch),
  });
}
