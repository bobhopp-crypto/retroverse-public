import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

import { loadAcceptedBridgeRequests } from "@/lib/song-requests/store";

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
    return NextResponse.json(await loadAcceptedBridgeRequests(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Request list is temporarily unavailable." }, { status: 503 });
  }
}
