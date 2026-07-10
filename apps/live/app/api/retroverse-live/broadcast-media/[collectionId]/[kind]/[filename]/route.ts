import { NextResponse } from "next/server";

import { saveRemoteBroadcastMedia } from "@/lib/bobos/importer/media-remote";
import { serveBroadcastMedia } from "@/lib/bobos/importer/serve-media";
import { verifyLiveNowPlayingSecret } from "@/lib/live-now-playing/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ collectionId: string; kind: string; filename: string }> };

/**
 * Patron-facing broadcast slide media.
 * Serves imported collection masters/thumbnails for retroverse.live and Studio.
 */
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
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}

/** Studio pushes thumb bytes here after each broadcast snapshot sync. */
export async function PUT(req: Request, ctx: Ctx) {
  if (!verifyLiveNowPlayingSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { collectionId, kind, filename } = await ctx.params;
  if (kind !== "masters" && kind !== "thumbs") {
    return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  }
  if (filename.includes("/") || filename.includes("..")) {
    return NextResponse.json({ error: "invalid_filename" }, { status: 400 });
  }

  const buffer = Buffer.from(await req.arrayBuffer());
  if (buffer.length === 0) {
    return NextResponse.json({ error: "empty_body" }, { status: 400 });
  }

  const contentType = req.headers.get("content-type")?.trim() || "application/octet-stream";
  await saveRemoteBroadcastMedia({
    collectionId,
    kind,
    filename,
    contentType,
    dataBase64: buffer.toString("base64"),
  });

  return NextResponse.json({ ok: true });
}
