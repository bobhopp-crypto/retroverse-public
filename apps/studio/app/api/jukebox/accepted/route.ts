import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { loadJukeboxAcceptedBridgeRequests } from "@/lib/song-requests/jukebox-local-store";
import { pollAndIngestPublicJukeboxRequests } from "@/lib/song-requests/jukebox-relay-client";

export const dynamic = "force-dynamic";

function authorized(request: Request, expected: string): boolean {
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!supplied || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export async function GET(request: Request) {
  const token = process.env.RETROVERSE_REQUEST_BRIDGE_TOKEN?.trim() ?? "";
  if (!token) return NextResponse.json({ error: "Bridge is not configured." }, { status: 503 });
  if (!authorized(request, token)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await pollAndIngestPublicJukeboxRequests().catch(() => undefined);
    return NextResponse.json(await loadJukeboxAcceptedBridgeRequests(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Request list is temporarily unavailable." }, { status: 503 });
  }
}
