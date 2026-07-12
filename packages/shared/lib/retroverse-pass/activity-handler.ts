import { NextResponse } from "next/server";

import type { recordPassActivity } from "./store";
import {
  PASS_ACTIVITY_EVENT_TYPES,
  normalizePassSerial,
  type PassActivityEventType,
} from "./types";

type RecordActivity = typeof recordPassActivity;

/** Validate and record one actual visitor action (SEARCH, OPEN_ARTIST, …). */
export async function handlePassActivity(req: Request, recordActivity: RecordActivity) {
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
  if (payload.serial && !normalizePassSerial(payload.serial)) {
    return NextResponse.json({ error: "Invalid pass serial." }, { status: 400 });
  }

  try {
    await recordActivity({
      visitorId: typeof payload.visitorId === "number" ? payload.visitorId : null,
      passSerial: payload.serial?.trim().toUpperCase() ?? null,
      eventType,
      metadata: payload.metadata ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Pass activity is temporarily unavailable." },
      { status: 503 },
    );
  }
}
