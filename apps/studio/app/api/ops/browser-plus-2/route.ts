import { NextResponse } from "next/server";

import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  try {
    const { loadBrowserPlus2Model } = await import("@/lib/ops/browser-plus-2/load-browser-plus-2");
    const model = await loadBrowserPlus2Model();
    return NextResponse.json({ ok: true, model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "load_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
