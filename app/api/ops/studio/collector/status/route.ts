import { NextResponse } from "next/server";

import { loadCollectorLiveStatus } from "@/lib/ops/studio/department-status";

export const dynamic = "force-dynamic";

function opsEnabled(): boolean {
  return process.env.RETROVERSE_OPS === "1";
}

export async function GET() {
  if (!opsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  const status = await loadCollectorLiveStatus();
  return NextResponse.json({ ok: true, status });
}
