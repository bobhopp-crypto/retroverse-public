import { NextResponse } from "next/server";

import { ensureMediaCollectionsInitialized } from "@/lib/ops/media-collections/init";
import { collectionIdFromSlug } from "@/lib/ops/media-collections/paths";
import { scanCollectionPlaylist } from "@/lib/ops/media-collections/scan-playlist";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function opsEnabled(): boolean {
  return process.env.RETROVERSE_OPS === "1";
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ collection: string }> },
) {
  if (!opsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const { collection: slug } = await ctx.params;
  const collectionId = collectionIdFromSlug(slug);

  await ensureMediaCollectionsInitialized();
  const result = await scanCollectionPlaylist(collectionId);

  if (!result.ok) {
    return NextResponse.json({ ...result, ok: false }, { status: 400 });
  }

  return NextResponse.json({ ...result, ok: true });
}
