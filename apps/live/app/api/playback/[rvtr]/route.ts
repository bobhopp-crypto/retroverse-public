import { NextResponse } from "next/server";

import { resolveTrackPlayback } from "@/lib/playback/resolve-track-playback";

type RouteContext = { params: Promise<{ rvtr: string }> };

export async function GET(req: Request, context: RouteContext) {
  const { rvtr } = await context.params;
  const url = new URL(req.url);
  const title = url.searchParams.get("title") ?? undefined;
  const artist = url.searchParams.get("artist") ?? undefined;

  const result = await resolveTrackPlayback(rvtr, { title, artist });
  if (!result) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...result });
}
