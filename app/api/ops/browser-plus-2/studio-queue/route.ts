import { NextResponse } from "next/server";

import {
  cancelStudioJob,
  enqueueStudioJobs,
  getStudioQueueStatus,
  retryStudioJob,
  setStudioQueuePaused,
} from "@/lib/ops/browser-plus-2/studio-queue";
import type { Bp2StudioQueueDepartment } from "@/lib/ops/browser-plus-2/types";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseDepartment(raw: unknown): Bp2StudioQueueDepartment | null {
  const allowed: Bp2StudioQueueDepartment[] = [
    "run-collector",
    "run-editor",
    "run-director",
    "refresh-research",
    "rebuild-experience",
  ];
  return typeof raw === "string" && allowed.includes(raw as Bp2StudioQueueDepartment)
    ? (raw as Bp2StudioQueueDepartment)
    : null;
}

export async function GET() {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }
  try {
    const status = await getStudioQueueStatus();
    return NextResponse.json({ ok: true, ...status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "queue_status_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  let body: {
    action?: string;
    department?: string;
    rvtrs?: string[];
    jobId?: string;
    paused?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  try {
    if (body.action === "pause") {
      await setStudioQueuePaused(body.paused ?? true);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "resume") {
      await setStudioQueuePaused(false);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "cancel" && body.jobId) {
      const ok = await cancelStudioJob(body.jobId);
      return NextResponse.json({ ok });
    }
    if (body.action === "retry" && body.jobId) {
      const job = await retryStudioJob(body.jobId);
      return NextResponse.json({ ok: Boolean(job), job });
    }

    const department = parseDepartment(body.department);
    const rvtrs = Array.isArray(body.rvtrs) ? body.rvtrs : [];
    if (!department || rvtrs.length === 0) {
      return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
    }

    const job = await enqueueStudioJobs(department, rvtrs);
    return NextResponse.json({ ok: true, job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "queue_action_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
