import { NextResponse } from "next/server";

import { browsePerformances } from "@/lib/ops/media-lab/performance-browser/browse";
import type { MsExportGrouping } from "@/lib/ops/media-collections/midnight-special/export-metadata";
import type { PerformanceStatus } from "@/lib/ops/media-collections/midnight-special/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function opsEnabled(): boolean {
  return process.env.RETROVERSE_OPS === "1";
}

const STATUSES: PerformanceStatus[] = [
  "candidate",
  "review",
  "accepted",
  "rejected",
  "exported",
];

const CLASSIFICATIONS: (MsExportGrouping | "Unknown")[] = [
  "Performance",
  "Comedy",
  "Interview",
  "Intro",
  "Movie Clip",
  "Commercial",
  "Unknown",
];

export async function GET(req: Request) {
  if (!opsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const collection = url.searchParams.get("collection") ?? undefined;
  const yearRaw = url.searchParams.get("year");
  const status = url.searchParams.get("status") ?? undefined;
  const classification = url.searchParams.get("classification") ?? undefined;
  const limitRaw = url.searchParams.get("limit");

  const year = yearRaw ? Number(yearRaw) : undefined;
  const limit = limitRaw ? Number(limitRaw) : undefined;

  const result = await browsePerformances({
    q,
    collection: collection === "all" ? undefined : collection,
    year: year && Number.isFinite(year) ? year : undefined,
    status:
      status && (status === "all" || STATUSES.includes(status as PerformanceStatus))
        ? (status as PerformanceStatus | "all")
        : undefined,
    classification:
      classification &&
      (classification === "all" || CLASSIFICATIONS.includes(classification as MsExportGrouping))
        ? (classification as MsExportGrouping | "Unknown" | "all")
        : undefined,
    limit,
  });

  return NextResponse.json({ ok: true, ...result });
}
