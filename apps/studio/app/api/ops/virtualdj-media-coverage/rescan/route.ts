import { NextResponse } from "next/server";

import { recheckBatchAfterRescan } from "@/lib/ops/video-acquisition/run-batch";

import { coverageError, requireCoverageOps } from "../_helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const disabled = requireCoverageOps();
  if (disabled) return disabled;

  let body: { batchId?: string; confirm?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.batchId?.trim()) {
    return NextResponse.json({ ok: false, error: "batchId required" }, { status: 400 });
  }

  if (!body.confirm) {
    return NextResponse.json({
      ok: true,
      preview: true,
      instructions: [
        "Quit VirtualDJ if it is open.",
        "In VirtualDJ, scan the production video folder under DJ MEDIA/VIDEO.",
        "Wait for the scan to finish, then confirm below.",
      ],
    });
  }

  try {
    const result = await recheckBatchAfterRescan(body.batchId.trim());
    return NextResponse.json({
      ok: true,
      batch: result.manifest,
      completed: result.completed,
      stillAwaiting: result.stillAwaiting,
    });
  } catch (error) {
    return coverageError(error, "Rescan recheck failed");
  }
}
