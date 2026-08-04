import { NextResponse } from "next/server";

import { runBillboardCoverageScan } from "@/lib/ops/virtualdj-media-coverage/chart-scan";
import { listSavedChartScans } from "@/lib/ops/virtualdj-media-coverage/chart-store";
import type { BillboardSetType } from "@/lib/ops/virtualdj-media-coverage/types";

import { coverageError, requireCoverageOps } from "../_helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  const disabled = requireCoverageOps();
  if (disabled) return disabled;
  try {
    return NextResponse.json({ ok: true, scans: await listSavedChartScans() });
  } catch (error) {
    return coverageError(error, "Could not list scans");
  }
}

export async function POST(request: Request) {
  const disabled = requireCoverageOps();
  if (disabled) return disabled;
  let body: { setType?: BillboardSetType; year?: number; chartDate?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.setType || !["chart_week", "chart_year"].includes(body.setType)) {
    return NextResponse.json({ ok: false, error: "Valid Billboard set type required" }, { status: 400 });
  }
  if (!Number.isInteger(body.year)) {
    return NextResponse.json({ ok: false, error: "Valid Billboard year required" }, { status: 400 });
  }
  try {
    const scan = await runBillboardCoverageScan({
      setType: body.setType,
      year: body.year!,
      chartDate: body.chartDate,
    });
    return NextResponse.json({ ok: true, scan });
  } catch (error) {
    return coverageError(error, "Billboard media coverage scan failed");
  }
}
