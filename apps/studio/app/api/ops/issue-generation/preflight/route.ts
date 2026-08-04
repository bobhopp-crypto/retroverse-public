import { NextResponse } from "next/server";

import { preflightHomePageEligibility } from "@/lib/ops/home-page-factory-eligibility";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isOpsEnabled()) return new NextResponse("Not found", { status: 404 });
  const url = new URL(request.url);
  const rvtr = url.searchParams.get("rvtr")?.toUpperCase() ?? null;
  const fileExists = url.searchParams.get("fileExists") !== "0";
  const isVideo = url.searchParams.get("isVideo") !== "0";
  const playCount = Number(url.searchParams.get("playCount") ?? "0") || 0;
  const result = await preflightHomePageEligibility({
    rvtr,
    fileExists,
    isVideo,
    playCount,
  });
  return NextResponse.json(result, {
    headers: { "cache-control": "private, no-store" },
  });
}
