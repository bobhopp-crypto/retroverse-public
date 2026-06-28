import { NextResponse } from "next/server";

import { saveOperatorExperienceScorecard } from "@/lib/ops/studio/publisher/experience/scorecard-store";
import type { ExperienceScorecardDimensionId } from "@/lib/ops/studio/publisher/experience/types";
import { normalizeRvtr } from "@/lib/studio/status";

type RouteContext = { params: Promise<{ rvtr: string }> };

const DIMENSION_IDS: ExperienceScorecardDimensionId[] = [
  "openingImpact",
  "visualSurprise",
  "emotionalArc",
  "memorability",
  "rhythm",
  "endingStrength",
  "watchTwice",
];

export async function POST(req: Request, context: RouteContext) {
  const { rvtr: rvtrParam } = await context.params;
  const rvtr = normalizeRvtr(rvtrParam);
  if (!rvtr) {
    return NextResponse.json({ ok: false, error: "invalid_rvtr" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const input = body as {
    scores?: Record<string, number>;
    note?: string | null;
  };

  const scores: Partial<Record<ExperienceScorecardDimensionId, number>> = {};
  for (const id of DIMENSION_IDS) {
    const value = input.scores?.[id];
    if (typeof value === "number") scores[id] = value;
  }

  try {
    const record = await saveOperatorExperienceScorecard({
      rvtr,
      scores,
      note: input.note,
    });
    return NextResponse.json({ ok: true, record });
  } catch (err) {
    const message = err instanceof Error ? err.message : "save_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
