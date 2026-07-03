import { NextResponse } from "next/server";

import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { getEnrichedReviewQueue } from "@/lib/ops/media-collections/midnight-special/performances";
import type { PerformanceStatus } from "@/lib/ops/media-collections/midnight-special/types";

export const dynamic = "force-dynamic";

const VALID: PerformanceStatus[] = ["candidate", "accepted", "review", "rejected", "exported"];

export async function GET(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 404 });
  }

  const statusParam = new URL(req.url).searchParams.get("status")?.trim() ?? "review";
  const status = (VALID.includes(statusParam as PerformanceStatus)
    ? statusParam
    : "review") as PerformanceStatus;

  const queue = await getEnrichedReviewQueue(status);
  return NextResponse.json({
    ok: true,
    status,
    count: queue.performances.length,
    ...queue,
  });
}
