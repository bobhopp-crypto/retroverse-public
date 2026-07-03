import { NextResponse } from "next/server";

import { loadIntelligenceRunProgress } from "@/lib/ops/intelligence/run-progress";

export const dynamic = "force-dynamic";

function opsEnabled(): boolean {
  return process.env.RETROVERSE_OPS === "1";
}

export async function GET() {
  if (!opsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  const progress = await loadIntelligenceRunProgress();
  return NextResponse.json({ ok: true, progress });
}
