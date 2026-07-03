import { NextResponse } from "next/server";

import { loadAllStarSnapshot } from "@/lib/ops/allstar/load-allstar";
import { buildSmartReviewQueue } from "@/lib/ops/allstar/review-priority";
import { loadReviewState, setReviewStatus } from "@/lib/ops/allstar/review-state";
import type { ReviewStatus } from "@/lib/ops/allstar/review-state";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isOpsEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = new URL(req.url);
  const discId = url.searchParams.get("discId");

  const [snapshot, reviewState] = await Promise.all([
    loadAllStarSnapshot(),
    loadReviewState(),
  ]);

  const processed = snapshot.discs.filter((d) => d.processingStatus === "processed");

  if (discId) {
    const disc = processed.find((d) => d.id === discId) ?? snapshot.discs.find((d) => d.id === discId);
    if (!disc) {
      return NextResponse.json({ ok: false, error: "Disc not found" }, { status: 404 });
    }
    const priority = (await buildSmartReviewQueue()).find((e) => e.disc.id === discId);
    return NextResponse.json({
      disc,
      review: reviewState.items[discId] ?? { discId, status: "pending", reviewedAt: null },
      priority,
    });
  }

  const queue = await buildSmartReviewQueue();
  const nextEntry = queue[0] ?? null;
  const next = nextEntry?.disc ?? null;

  return NextResponse.json({
    total: processed.length,
    reviewed: processed.filter((d) => {
      const s = reviewState.items[d.id]?.status;
      return s && s !== "pending";
    }).length,
    pending: queue.length,
    next,
    nextPriority: nextEntry,
    reviewState,
  });
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const body = (await req.json()) as {
    discId?: string;
    action?: ReviewStatus;
    note?: string;
  };

  if (!body.discId || !body.action) {
    return NextResponse.json({ ok: false, error: "discId and action required" }, { status: 400 });
  }

  const allowed: ReviewStatus[] = ["accepted", "correct", "skipped", "pending"];
  if (!allowed.includes(body.action)) {
    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  }

  const state = await setReviewStatus(body.discId, body.action, body.note);
  return NextResponse.json({ ok: true, reviewState: state });
}
