import { NextResponse } from "next/server";

import { ensureMediaCollectionsInitialized } from "@/lib/ops/media-collections/init";
import { loadMediaCollectionDetail } from "@/lib/ops/media-collections/load";
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

  await ensureMediaCollectionsInitialized();
  const data = await loadMediaCollectionDetail(collectionId);

  if (!data) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...data });
}
