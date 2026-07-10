import { NextResponse } from "next/server";

import { serveBroadcastMedia } from "@/lib/bobos/importer/serve-media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ collectionId: string; kind: string; filename: string }> };

/** Legacy ops path — serves the same bytes as /api/retroverse-live/broadcast-media/. */
export async function GET(_req: Request, ctx: Ctx) {
  const { collectionId, kind, filename } = await ctx.params;
  if (kind !== "masters" && kind !== "thumbs") {
    return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  }

  const result = await serveBroadcastMedia(collectionId, kind, filename);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "private, max-age=86400, immutable",
    },
  });
}
