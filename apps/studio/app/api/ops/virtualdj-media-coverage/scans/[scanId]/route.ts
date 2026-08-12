import { NextResponse } from "next/server";

import { loadChartCoverageScan } from "@/lib/ops/virtualdj-media-coverage/chart-store";

import { coverageError, requireCoverageOps } from "../../_helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ scanId: string }> },
) {
  const disabled = requireCoverageOps();
  if (disabled) return disabled;
  try {
    const scan = await loadChartCoverageScan((await context.params).scanId);
    if (!scan) return NextResponse.json({ ok: false, error: "Scan not found" }, { status: 404 });
    return NextResponse.json({ ok: true, scan });
  } catch (error) {
    return coverageError(error, "Could not load scan");
  }
}
