import { NextResponse } from "next/server";

import { normalizeParsedPlan } from "@/lib/ops/event-studio/producer/normalize";
import { syncProducerPlanToStudio } from "@/lib/ops/event-studio/producer/sync-identity";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  try {
    const body = (await req.json()) as { parsedPlan?: unknown };
    const parsedPlan = normalizeParsedPlan(body.parsedPlan);
    const config = await syncProducerPlanToStudio(parsedPlan);
    return NextResponse.json({ ok: true, config });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
