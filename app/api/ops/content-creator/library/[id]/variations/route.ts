import { NextResponse } from "next/server";

import { enqueueContentCreatorJob } from "@/lib/ops/content-creator/jobs/enqueue";
import { generateVariationsFromParent, libraryFileUrl, loadGenerationManifest } from "@/lib/ops/content-creator/library";
import { vNextFileUrl } from "@/lib/ops/content-creator/vnext-run";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { listRvbrProfiles } from "@/lib/ops/rvbr/profiles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = (await req.json()) as { count?: number; background?: boolean };
  const count = typeof body.count === "number" ? body.count : 10;

  const profiles = await listRvbrProfiles();
  const parent = await loadGenerationManifest(id);
  if (!parent) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const profile = profiles.find((p) => p.slug === parent.eraSlug) ?? profiles[0];
  if (!profile) return NextResponse.json({ error: "No RVBR profiles" }, { status: 503 });

  if (body.background === true) {
    const job = await enqueueContentCreatorJob({
      type: "variations",
      title: `Variations · ${parent.event}`,
      payload: { parentId: id, count, eraSlug: parent.eraSlug },
    });
    return NextResponse.json({ ok: true, background: true, jobId: job.id });
  }

  try {
    const result = await generateVariationsFromParent({ parentId: id, count, profile });
    const runs = result.runIds.map((runId) => ({
      runId,
      frontUrl: vNextFileUrl(runId, "front.png"),
      backUrl: vNextFileUrl(runId, "back.png"),
      thumbnailUrl: libraryFileUrl(`thumbnails/${runId}.jpg`),
    }));
    return NextResponse.json({ ok: true, ...result, runs });
  } catch (e) {
    const message = e instanceof Error ? e.message : "variations_failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
