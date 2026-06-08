import { NextResponse } from "next/server";

import { listMediaLabJobs } from "@/lib/ops/media-lab/list-jobs";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseYear(value: string | null): number | null {
  const y = Number(value);
  if (!Number.isFinite(y) || y < 1900 || y >= 2100) return null;
  return y;
}

export async function GET(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const url = new URL(req.url);
  const year = parseYear(url.searchParams.get("year"));
  if (year == null) {
    return NextResponse.json({ error: "year required" }, { status: 400 });
  }

  try {
    const jobs = await listMediaLabJobs(year);
    return NextResponse.json({ ok: true, year, jobs });
  } catch (e) {
    const message = e instanceof Error ? e.message : "List failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
