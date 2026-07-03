import { NextResponse } from "next/server";

import { isInspectEnabled } from "@/lib/inspect/dev-gate";
import { runArtistInspect } from "@/lib/inspect/run-artist-inspect";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isInspectEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Graph inspector is disabled outside local development." },
      { status: 404 },
    );
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";

  try {
    const payload = await runArtistInspect(q);
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn("[inspect]", { q, message });
    return NextResponse.json(
      {
        ok: false,
        q,
        devOnly: true,
        error: message,
      },
      { status: 500 },
    );
  }
}
