import { NextResponse } from "next/server";

import {
  loadRvTagsReviewQueue,
  saveRvTagsReviewDecision,
} from "@/lib/ops/rvtags-review/load-queue";
import { normalizeRvTags, RV_TAG_VOCABULARY } from "@/lib/ops/rvtags-review/vocabulary";

export const dynamic = "force-dynamic";

function parseYear(value: string | null): number | null {
  const y = Number(value);
  if (!Number.isFinite(y) || y < 1900 || y >= 2100) return null;
  return y;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const year = parseYear(url.searchParams.get("year"));
  if (year == null) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  try {
    const queue = await loadRvTagsReviewQueue(year);
    return NextResponse.json({
      ok: true,
      year: queue.year,
      items: queue.items,
      reviewedCount: queue.reviewedCount,
      total: queue.total,
      vocabulary: RV_TAG_VOCABULARY,
      pilotPath: queue.pilotPath,
      reviewedPath: queue.reviewedPath,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Load failed";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as {
    year?: number;
    filePath?: string;
    tags?: string[];
  };

  const year =
    typeof payload.year === "number" ? parseYear(String(payload.year)) : null;
  const filePath = payload.filePath?.trim();
  if (year == null || !filePath) {
    return NextResponse.json({ error: "year and filePath required" }, { status: 400 });
  }

  const tags = normalizeRvTags(Array.isArray(payload.tags) ? payload.tags : []);

  try {
    const result = await saveRvTagsReviewDecision({ year, filePath, tags });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
