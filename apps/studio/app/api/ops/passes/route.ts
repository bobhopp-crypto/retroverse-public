import { NextResponse } from "next/server";

import { appendPassArchiveEntry, loadPassArchive } from "@/lib/ops/passes/archive";
import { PASS_STYLES } from "@/lib/ops/passes/types";

export const dynamic = "force-dynamic";

function parseBody(body: unknown): {
  title: string;
  venue: string;
  date: string;
  years: string;
  style: string;
} | null {
  if (!body || typeof body !== "object") return null;
  const payload = body as Record<string, unknown>;
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const venue = typeof payload.venue === "string" ? payload.venue.trim() : "";
  const date = typeof payload.date === "string" ? payload.date.trim() : "";
  const years = typeof payload.years === "string" ? payload.years.trim() : "";
  const style = typeof payload.style === "string" ? payload.style.trim() : "";

  if (!title || !venue || !date || !years || !style) return null;
  if (!PASS_STYLES.includes(style as (typeof PASS_STYLES)[number])) return null;

  return { title, venue, date, years, style };
}

export async function GET() {
  try {
    const archive = await loadPassArchive();
    return NextResponse.json(archive);
  } catch (err) {
    console.error("[ops/passes GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Load failed" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return NextResponse.json({ error: "title, venue, date, years, and style required" }, { status: 400 });
  }

  try {
    const entry = await appendPassArchiveEntry(parsed);
    return NextResponse.json({ entry });
  } catch (err) {
    console.error("[ops/passes POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 },
    );
  }
}
