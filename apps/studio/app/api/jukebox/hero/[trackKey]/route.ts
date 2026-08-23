import { NextResponse } from "next/server";

import { loadJukeboxHeroResponse } from "@/lib/song-requests/jukebox-hero";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ trackKey: string }> },
) {
  try {
    return await loadJukeboxHeroResponse((await context.params).trackKey);
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
