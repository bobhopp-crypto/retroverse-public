import { NextResponse } from "next/server";

import { recordPassActivity } from "@/lib/retroverse-pass/store";
import {
  PASS_ACTIVITY_EVENT_TYPES,
  normalizePassSerial,
  type PassActivityEventType,
} from "@/lib/retroverse-pass/types";

export const dynamic = "force-dynamic";

/** Record one actual visitor action (SEARCH, OPEN_ARTIST, …). Never inferred. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as {
    serial?: string | null;
    visitorId?: number | null;
    eventType?: string;
    metadata?: Record<string, unknown> | null;
  };

  const eventType = payload.eventType as PassActivityEventType;
  if (!PASS_ACTIVITY_EVENT_TYPES.includes(eventType)) {
    return NextResponse.json({ error: "Unknown event type." }, { status: 400 });
  }

  const serial = payload.serial ? normalizePassSerial(payload.serial) : null;

  try {
    await recordPassActivity({
      visitorId: typeof payload.visitorId === "number" ? payload.visitorId : null,
      passSerial: serial,
      eventType,
      metadata: payload.metadata ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Activity failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
