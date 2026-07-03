import { NextResponse } from "next/server";

import { loadHistoricalEvent } from "@/lib/events/load-historical-event";
import { loadEventIngestManifest } from "@/lib/events/load-event-ingest";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Props) {
  const slug = (await params).slug.trim().toLowerCase();
  const [event, manifest] = await Promise.all([
    loadHistoricalEvent(slug),
    loadEventIngestManifest(slug),
  ]);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({
    event,
    manifest,
    source: manifest ? "ingest" : "unknown",
  });
}
