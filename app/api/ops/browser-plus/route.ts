import { NextResponse } from "next/server";

import { attachBrowserPlusChartCoverage } from "@/lib/ops/browser-plus/chart-universe";
import { loadBrowserPlusModel } from "@/lib/ops/browser-plus/load-browser-plus";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  const model = await attachBrowserPlusChartCoverage(await loadBrowserPlusModel());
  return NextResponse.json({ ok: true, model });
}
