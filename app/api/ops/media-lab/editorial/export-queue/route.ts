import { NextResponse } from "next/server";

import {
  buildQueueExportRows,
  writeQueueExportFiles,
  type QueueExportInput,
} from "@/lib/ops/media-lab/editorial/export-queue-manifest";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  let body: { source?: string; items?: QueueExportInput[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const source = body.source?.trim() || "Media Lab";
  const items = Array.isArray(body.items) ? body.items : [];

  if (items.length === 0) {
    return NextResponse.json({ error: "Queue is empty" }, { status: 400 });
  }

  for (const item of items) {
    if (!item.title?.trim()) {
      return NextResponse.json({ error: "Each queue item needs a title" }, { status: 400 });
    }
    if (
      !Number.isFinite(item.inSeconds) ||
      !Number.isFinite(item.outSeconds) ||
      item.outSeconds <= item.inSeconds
    ) {
      return NextResponse.json({ error: "Invalid IN/OUT on queue item" }, { status: 400 });
    }
  }

  try {
    const rows = buildQueueExportRows(source, items);
    const { exportDir, jsonPath, csvPath } = await writeQueueExportFiles(rows);

    return NextResponse.json({
      ok: true,
      count: rows.length,
      exportDir,
      jsonPath,
      csvPath,
      message: `Exported ${rows.length} clips`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
