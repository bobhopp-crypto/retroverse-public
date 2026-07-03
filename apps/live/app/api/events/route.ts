import { NextResponse } from "next/server";

import { listHistoricalEventSummaries } from "@/lib/events/load-event-ingest";

export const dynamic = "force-dynamic";

export async function GET() {
  const events = await listHistoricalEventSummaries();
  return NextResponse.json({ events });
}
