import { NextResponse } from "next/server";

import { inspectPing } from "@/lib/inspect/pg";
import { loadCrossroads } from "@/lib/ops/crossroads/load-crossroads";

export const dynamic = "force-dynamic";

function parseYear(value: string | null): number | null {
  if (!value?.trim()) return null;
  const y = Number(value);
  if (!Number.isFinite(y) || y < 1900 || y >= 2100) return null;
  return y;
}

export async function GET(req: Request) {
  const ping = await inspectPing();
  if (!ping.ok) {
    return NextResponse.json(
      { error: ping.error ?? "Postgres offline" },
      { status: 503 },
    );
  }

  const params = new URL(req.url).searchParams;
  const yearA = parseYear(params.get("yearA"));
  const yearB = parseYear(params.get("yearB"));
  const yearC = parseYear(params.get("yearC"));

  if (yearA == null || yearB == null || yearC == null) {
    return NextResponse.json(
      { error: "yearA, yearB, and yearC are required (1900–2099)" },
      { status: 400 },
    );
  }

  const distinct = new Set([yearA, yearB, yearC]);
  if (distinct.size < 2) {
    return NextResponse.json(
      { error: "Pick at least two different years" },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await loadCrossroads(yearA, yearB, yearC));
  } catch (err) {
    console.error("[crossroads GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Load failed" },
      { status: 500 },
    );
  }
}
