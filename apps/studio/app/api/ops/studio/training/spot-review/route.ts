import { NextResponse } from "next/server";

import { buildTrainingSongSnapshot } from "@/lib/ops/studio/training/build-snapshot";
import { appendSpotReviewBatch, loadTrainingReviewStore } from "@/lib/ops/studio/training/store";
import {
  averageConfidence,
  averageRisk,
  pickSpotReviewRvtrs,
  type SpotReviewCandidate,
} from "@/lib/ops/studio/training/spot-review";
import { normalizeRvtr } from "@/lib/studio/status";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const input = body as { rvtrs?: string[]; batchSize?: number };
  const rvtrs = (input.rvtrs ?? [])
    .map((r) => normalizeRvtr(r))
    .filter((r): r is string => Boolean(r))
    .slice(0, input.batchSize ?? 20);

  if (rvtrs.length === 0) {
    return NextResponse.json({ ok: false, error: "no_rvtrs" }, { status: 400 });
  }

  const candidates: SpotReviewCandidate[] = [];
  for (const rvtr of rvtrs) {
    const snapshot = await buildTrainingSongSnapshot(rvtr);
    if (!snapshot) continue;
    const avgConf =
      snapshot.departments.reduce((sum, d) => sum + d.confidence, 0) /
      Math.max(1, snapshot.departments.length);
    const missing = snapshot.departments.filter(
      (d) => d.status !== "ready" || d.confidence < 70,
    ).length;
    candidates.push({
      rvtr,
      confidence: Math.round(avgConf),
      risk: Math.min(100, missing * 18 + (100 - Math.round(avgConf))),
    });
  }

  const picked = pickSpotReviewRvtrs(candidates, 3);
  const batch = {
    id: `spot-${Date.now()}`,
    rvtrs: picked,
    sampledAt: new Date().toISOString(),
    batchSize: rvtrs.length,
    method: "confidence_risk_random" as const,
  };

  await appendSpotReviewBatch(batch);
  const store = await loadTrainingReviewStore();

  return NextResponse.json({
    ok: true,
    batch,
    stats: {
      candidateCount: candidates.length,
      averageConfidence: averageConfidence(candidates),
      averageRisk: averageRisk(candidates),
    },
    recentBatches: store.spotReviews.slice(0, 5),
  });
}
