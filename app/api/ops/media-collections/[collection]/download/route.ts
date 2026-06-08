import { NextResponse } from "next/server";

import { buildDownloadProgress, loadDownloadRunState } from "@/lib/ops/media-collections/download-state";
import { runDownloadMissing } from "@/lib/ops/media-collections/download-runner";
import { spawnDownloadRunner } from "@/lib/ops/media-collections/spawn-download";
import { collectionIdFromSlug } from "@/lib/ops/media-collections/paths";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function opsEnabled(): boolean {
  return process.env.RETROVERSE_OPS === "1";
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ collection: string }> },
) {
  if (!opsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const { collection: slug } = await ctx.params;
  const collectionId = collectionIdFromSlug(slug);
  const run = await loadDownloadRunState(collectionId);
  const progress = await buildDownloadProgress(collectionId, run);

  return NextResponse.json({ ok: true, progress });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ collection: string }> },
) {
  if (!opsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const { collection: slug } = await ctx.params;
  const collectionId = collectionIdFromSlug(slug);

  let body: { limit?: number; background?: boolean } = {};
  try {
    body = (await req.json()) as { limit?: number; background?: boolean };
  } catch {
    // defaults
  }

  const limit = typeof body.limit === "number" && body.limit > 0 ? body.limit : undefined;
  const background = body.background !== false;

  const existing = await loadDownloadRunState(collectionId);
  if (existing?.running) {
    const progress = await buildDownloadProgress(collectionId, existing);
    return NextResponse.json(
      { ok: false, error: "Download already running", progress },
      { status: 409 },
    );
  }

  if (background) {
    spawnDownloadRunner(collectionId, limit);
    const progress = await buildDownloadProgress(collectionId, {
      version: 1,
      collection_id: collectionId,
      running: true,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      queued: 0,
      downloading: 0,
      downloaded: 0,
      failed: 0,
      remaining: 0,
      total: 0,
      completed_this_run: 0,
      failed_this_run: 0,
      limit,
    });
    return NextResponse.json({ ok: true, started: true, progress });
  }

  const result = await runDownloadMissing(collectionId, { limit });
  const progress = await buildDownloadProgress(collectionId);
  return NextResponse.json({ ok: result.ok, result, progress });
}
