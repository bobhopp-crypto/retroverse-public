import { NextResponse } from "next/server";

import { loadBackfillStatus } from "@/lib/covers/backfill/metrics";

function opsEnabled(): boolean {
  return process.env.RETROVERSE_OPS === "1";
}

export async function GET() {
  if (!opsEnabled()) {
    return NextResponse.json({ ok: false, error: "Ops disabled" }, { status: 403 });
  }

  try {
    const status = await loadBackfillStatus();
    return NextResponse.json({ ok: true, ...status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
