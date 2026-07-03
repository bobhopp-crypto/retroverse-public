import { NextResponse } from "next/server";

import { spawnContentCreatorJobRunner } from "@/lib/ops/content-creator/jobs/spawn-runner";
import { retryJob } from "@/lib/ops/content-creator/jobs/store";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const { id } = await ctx.params;
  try {
    const job = await retryJob(id);
    spawnContentCreatorJobRunner();
    return NextResponse.json({ ok: true, job });
  } catch (e) {
    const message = e instanceof Error ? e.message : "retry_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
