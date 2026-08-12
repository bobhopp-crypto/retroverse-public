import { NextResponse } from "next/server";

import { loadBatchManifest } from "@/lib/ops/video-acquisition/batch-store";
import {
  chooseBatchReviewCandidate,
  keepBatchReviewItem,
  rejectBatchReviewItem,
  retryBatchItem,
  startBatchProcessing,
} from "@/lib/ops/video-acquisition/run-batch";

import { coverageError, requireCoverageOps } from "../../_helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ batchId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const disabled = requireCoverageOps();
  if (disabled) return disabled;

  const { batchId } = await context.params;
  try {
    const batch = await loadBatchManifest(batchId);
    if (!batch) {
      return NextResponse.json({ ok: false, error: "Batch not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, batch });
  } catch (error) {
    return coverageError(error, "Could not load batch");
  }
}

export async function POST(request: Request, context: RouteContext) {
  const disabled = requireCoverageOps();
  if (disabled) return disabled;

  const { batchId } = await context.params;
  let body: {
    action?: "keep" | "reject" | "choose" | "retry" | "resume";
    targetRowKey?: string;
    videoId?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.action) {
    return NextResponse.json({ ok: false, error: "action required" }, { status: 400 });
  }

  try {
    if (body.action === "resume") {
      startBatchProcessing(batchId);
      const batch = await loadBatchManifest(batchId);
      return NextResponse.json({ ok: true, batch });
    }

    if (!body.targetRowKey?.trim()) {
      return NextResponse.json({ ok: false, error: "targetRowKey required" }, { status: 400 });
    }

    if (body.action === "keep") {
      const batch = await keepBatchReviewItem(batchId, body.targetRowKey.trim());
      return NextResponse.json({ ok: true, batch });
    }
    if (body.action === "reject") {
      const batch = await rejectBatchReviewItem(batchId, body.targetRowKey.trim());
      return NextResponse.json({ ok: true, batch });
    }
    if (body.action === "choose") {
      if (!body.videoId?.trim()) {
        return NextResponse.json({ ok: false, error: "videoId required" }, { status: 400 });
      }
      const batch = await chooseBatchReviewCandidate({
        batchId,
        targetRowKey: body.targetRowKey.trim(),
        videoId: body.videoId.trim(),
      });
      return NextResponse.json({ ok: true, batch });
    }
    if (body.action === "retry") {
      await retryBatchItem(batchId, body.targetRowKey.trim());
      const batch = await loadBatchManifest(batchId);
      return NextResponse.json({ ok: true, batch });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return coverageError(error, "Batch action failed");
  }
}
