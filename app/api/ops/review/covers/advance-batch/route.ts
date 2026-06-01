import { NextResponse } from "next/server";

import { generateNextTrainingBatch } from "@/lib/cover-integrity/training-batch";
import { generateNextAcquireBatch } from "@/lib/ops/review/covers/acquire-batch";
import { retrainCoverReview } from "@/lib/ops/review/covers/retrain";

function opsEnabled(): boolean {
  return process.env.RETROVERSE_OPS === "1";
}

type ReviewMode = "integrity" | "acquire";

function parseMode(url: URL): ReviewMode | null {
  const mode = url.searchParams.get("mode")?.trim().toLowerCase();
  if (mode === "integrity" || mode === "acquire") return mode;
  return null;
}

export async function POST(req: Request) {
  if (!opsEnabled()) {
    return NextResponse.json({ ok: false, error: "Ops disabled" }, { status: 403 });
  }

  const mode = parseMode(new URL(req.url));
  if (!mode) {
    return NextResponse.json(
      { ok: false, error: "Query param mode=integrity|acquire required" },
      { status: 400 },
    );
  }

  try {
    const { weights } = await retrainCoverReview();
    const manifest =
      mode === "acquire" ? await generateNextAcquireBatch() : await generateNextTrainingBatch();

    return NextResponse.json({
      ok: true,
      mode,
      batchId: manifest.batchId,
      size: manifest.size,
      rvals: manifest.rvals,
      decisionCount: weights.decisionCount,
      excludedReviewed: manifest.excludedReviewed,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
