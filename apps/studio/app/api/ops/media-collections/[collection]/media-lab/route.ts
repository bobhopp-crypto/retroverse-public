import { NextResponse } from "next/server";

import { resolveMediaLabLink } from "@/lib/ops/media-collections/media-lab-link";
import { collectionIdFromSlug } from "@/lib/ops/media-collections/paths";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function opsEnabled(): boolean {
  return process.env.RETROVERSE_OPS === "1";
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ collection: string }> },
) {
  if (!opsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const { collection: slug } = await ctx.params;
  const collectionId = collectionIdFromSlug(slug);
  const episodeId = new URL(req.url).searchParams.get("episode")?.trim();

  if (!episodeId) {
    return NextResponse.json({ error: "episode query param required" }, { status: 400 });
  }

  const link = await resolveMediaLabLink(collectionId, episodeId);
  if (!link) {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, link });
}
