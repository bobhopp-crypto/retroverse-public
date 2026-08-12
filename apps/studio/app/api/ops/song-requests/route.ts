import { NextResponse } from "next/server";

import {
  applyOperatorRequestAction,
  loadOperatorRequests,
  SongRequestInputError,
} from "@/lib/song-requests/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await loadOperatorRequests(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Song requests are unavailable." },
      { status: 503 },
    );
  }
}

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const input = body as { requestId?: unknown; action?: unknown; response?: unknown };
  if (
    typeof input.action !== "string" ||
    !["accept", "skip", "played", "respond", "replenish"].includes(input.action)
  ) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }
  try {
    await applyOperatorRequestAction({
      requestId: Number(input.requestId),
      action: input.action as "accept" | "skip" | "played" | "respond" | "replenish",
      response: typeof input.response === "string" ? input.response : null,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SongRequestInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Action failed." }, { status: 503 });
  }
}
