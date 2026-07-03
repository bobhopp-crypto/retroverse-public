import { NextResponse } from "next/server";

import { generateNextTrainingBatch } from "@/lib/cover-integrity/training-batch";

function opsEnabled(): boolean {
  return process.env.RETROVERSE_OPS === "1";
}

export async function POST() {
  if (!opsEnabled()) {
    return NextResponse.json({ ok: false, error: "Ops disabled" }, { status: 403 });
  }

  try {
    const manifest = await generateNextTrainingBatch();
    return NextResponse.json({
      ok: true,
      batchId: manifest.batchId,
      size: manifest.size,
      rvals: manifest.rvals,
      excludedReviewed: manifest.excludedReviewed,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
