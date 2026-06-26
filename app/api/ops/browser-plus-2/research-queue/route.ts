import { NextResponse } from "next/server";

import { loadBp2CohortContext } from "@/lib/ops/browser-plus-2/cohorts";
import {
  getResearchBuildQueueStatus,
  startResearchBuildQueue,
} from "@/lib/ops/browser-plus-2/research-build-queue";
import type { Bp2ResearchQueueTier } from "@/lib/ops/browser-plus-2/types";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseTier(raw: unknown): Bp2ResearchQueueTier | undefined {
  if (raw === "sunday" || raw === "top100" || raw === "top500" || raw === "library") {
    return raw;
  }
  return undefined;
}

export async function GET() {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  try {
    const { loadBrowserPlus2Model } = await import("@/lib/ops/browser-plus-2/load-browser-plus-2");
    const model = await loadBrowserPlus2Model();
    return NextResponse.json({
      ok: true,
      tiers: model.researchQueue?.tiers ?? null,
      activeJob: model.researchQueue?.activeJob ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "queue_status_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  let body: { limit?: number; tier?: string; rvtr?: string };
  try {
    body = (await req.json()) as { limit?: number; tier?: string; rvtr?: string };
  } catch {
    body = {};
  }

  try {
    const { loadBrowserPlus2Model } = await import("@/lib/ops/browser-plus-2/load-browser-plus-2");
    const model = await loadBrowserPlus2Model();
    const cohortContext = await loadBp2CohortContext(model.rows);
    const job = await startResearchBuildQueue(model.rows, cohortContext, {
      limit: body.limit ?? (body.tier ? 1 : 5),
      tier: parseTier(body.tier),
      rvtr: body.rvtr ?? null,
    });
    return NextResponse.json({ ok: true, job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "queue_start_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
