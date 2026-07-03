import { NextResponse } from "next/server";

import { jobThumbnailUrl } from "@/lib/ops/content-creator/jobs/runner";
import { loadJob } from "@/lib/ops/content-creator/jobs/store";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const job = await loadJob(id);
  if (!job) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const started = job.startedAt ? new Date(job.startedAt).getTime() : null;
  const ended = job.completedAt ? new Date(job.completedAt).getTime() : Date.now();
  const elapsedMs = started ? ended - started : 0;

  return NextResponse.json({
    ok: true,
    job: {
      ...job,
      thumbnailUrl: jobThumbnailUrl(job),
      elapsedMs,
    },
  });
}
