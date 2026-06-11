import { NextResponse } from "next/server";

import { jobThumbnailUrl } from "@/lib/ops/content-creator/jobs/runner";
import { listJobs } from "@/lib/ops/content-creator/jobs/store";
import type { ContentCreatorJob } from "@/lib/ops/content-creator/jobs/types";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function serializeJob(job: ContentCreatorJob) {
  const started = job.startedAt ? new Date(job.startedAt).getTime() : null;
  const ended = job.completedAt ? new Date(job.completedAt).getTime() : Date.now();
  const elapsedMs = started ? ended - started : 0;

  return {
    ...job,
    thumbnailUrl: jobThumbnailUrl(job),
    elapsedMs,
  };
}

export async function GET() {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const jobs = await listJobs({ limit: 40 });
  const serialized = jobs.map(serializeJob);

  return NextResponse.json({
    ok: true,
    generating: serialized.filter((j) => j.status === "running"),
    waiting: serialized.filter((j) => j.status === "queued"),
    completed: serialized.filter((j) => j.status === "completed").slice(0, 12),
    failed: serialized.filter((j) => j.status === "failed").slice(0, 8),
  });
}
