import { NextResponse } from "next/server";

import { flattenEventChapters, loadHistoricalEvent } from "@/lib/events/load-historical-event";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

function parseIntParam(value: string | null): number | undefined {
  if (!value?.trim()) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(request: Request, { params }: Props) {
  const slug = (await params).slug.trim().toLowerCase();
  const url = new URL(request.url);
  const part = parseIntParam(url.searchParams.get("part"));
  const performer = url.searchParams.get("performer");
  const location = url.searchParams.get("location");

  const event = await loadHistoricalEvent(slug);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  let chapters = flattenEventChapters(event);
  if (part != null) chapters = chapters.filter((c) => c.part_number === part);
  if (performer?.trim()) {
    const needle = performer.trim().toLowerCase();
    chapters = chapters.filter((c) => c.performer_raw.toLowerCase().includes(needle));
  }
  if (location?.trim()) {
    const needle = location.trim().toLowerCase();
    chapters = chapters.filter((c) => c.location_raw.toLowerCase().includes(needle));
  }

  return NextResponse.json({
    event_slug: slug,
    count: chapters.length,
    chapters,
  });
}
