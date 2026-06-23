import { NextResponse } from "next/server";

import {
  getBrowserPlusExecutionJob,
  listBrowserPlusExecutionActions,
  startBrowserPlusExecutionJob,
} from "@/lib/ops/browser-plus/execution-runner";
import type { BrowserPlusExecutionActionId } from "@/lib/ops/browser-plus/execution-adapters";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  const url = new URL(req.url);
  const jobId = url.searchParams.get("jobId");
  if (jobId) {
    const job = await getBrowserPlusExecutionJob(jobId);
    if (!job) return NextResponse.json({ ok: false, error: "job_not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, job });
  }

  return NextResponse.json({ ok: true, ...listBrowserPlusExecutionActions() });
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  let body: {
    actionId?: BrowserPlusExecutionActionId;
    rows?: Array<{ rvtr?: string | null; title?: string; artist?: string; filePath?: string }>;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  try {
    const job = await startBrowserPlusExecutionJob({
      actionId: body.actionId as BrowserPlusExecutionActionId,
      rows: (body.rows ?? []).map((row) => ({
        rvtr: row.rvtr ?? null,
        title: row.title ?? "",
        artist: row.artist ?? "",
        filePath: row.filePath ?? "",
      })),
    });
    return NextResponse.json({ ok: true, job });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "execution_failed" },
      { status: 400 },
    );
  }
}
