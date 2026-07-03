import { NextResponse } from "next/server";

import { runCoverBackfillBatch } from "@/lib/covers/backfill/run-batch";

function opsEnabled(): boolean {
  return process.env.RETROVERSE_OPS === "1";
}

export async function POST() {
  if (!opsEnabled()) {
    return NextResponse.json({ ok: false, error: "Ops disabled" }, { status: 403 });
  }

  try {
    const { state, batch } = await runCoverBackfillBatch();
    return NextResponse.json({ ok: true, state, batch });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
