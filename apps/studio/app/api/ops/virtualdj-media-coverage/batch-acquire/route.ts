import { NextResponse } from "next/server";

import {
  buildBatchPreview,
  createBatchAcquireJob,
} from "@/lib/ops/video-acquisition/run-batch";

import { coverageError, requireCoverageOps } from "../_helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const disabled = requireCoverageOps();
  if (disabled) return disabled;

  let body: {
    scanId?: string;
    filter?: string;
    limit?: number;
    confirm?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.scanId?.trim()) {
    return NextResponse.json({ ok: false, error: "scanId required" }, { status: 400 });
  }
  if (!body.filter?.trim()) {
    return NextResponse.json({ ok: false, error: "filter required" }, { status: 400 });
  }

  const limit = Math.min(Math.max(body.limit ?? 25, 1), 25);

  try {
    const preview = await buildBatchPreview({
      scanId: body.scanId.trim(),
      filter: body.filter.trim(),
      limit,
    });
    if (!body.confirm) {
      return NextResponse.json({
        ok: true,
        preview: true,
        limit,
        scanLabel: preview.scanLabel,
        items: preview.items.map((item) => ({
          targetRowKey: item.targetRowKey,
          rvtr: item.rvtr,
          artist: item.artist,
          title: item.title,
          year: item.year,
          chartRank: item.chartRank,
        })),
      });
    }

    const manifest = await createBatchAcquireJob({
      scanId: body.scanId.trim(),
      filter: body.filter.trim(),
      limit,
    });
    return NextResponse.json({ ok: true, batch: manifest });
  } catch (error) {
    return coverageError(error, "Could not start batch acquisition");
  }
}
