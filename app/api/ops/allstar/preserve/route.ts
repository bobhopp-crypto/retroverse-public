import { NextResponse } from "next/server";

import { buildCollectionAudit } from "@/lib/ops/allstar/collection-audit";
import { buildCollectionHarvestMetrics } from "@/lib/ops/allstar/harvest-metrics";
import { loadPreserveQueue } from "@/lib/ops/allstar/preserve-queue";
import { spawnPreserveRunner } from "@/lib/ops/allstar/spawn-preserver";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isOpsEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const [queue, audit, metrics] = await Promise.all([
    loadPreserveQueue(),
    buildCollectionAudit(),
    buildCollectionHarvestMetrics(),
  ]);
  return NextResponse.json({ queue, audit, metrics });
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  let body: { action?: string } = {};
  try {
    body = (await req.json()) as { action?: string };
  } catch {
    // default start
  }

  const action = body.action ?? "start";
  const allowed = new Set(["start", "pause", "resume", "retry-failed"]);
  if (!allowed.has(action)) {
    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  }

  const queue = await loadPreserveQueue();
  if (action === "start" && queue?.status === "running") {
    return NextResponse.json({ ok: false, error: "Queue already running" }, { status: 409 });
  }

  spawnPreserveRunner(action as "start" | "pause" | "resume" | "retry-failed");
  const updated = await loadPreserveQueue();
  return NextResponse.json({ ok: true, action, queue: updated });
}
