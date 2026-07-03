import { NextResponse } from "next/server";

import { isOpsEnabled } from "@/lib/ops/ops-gate";
import {
  acceptAllExactMatches,
  generateAllPerformanceCandidates,
  loadPerformanceIndex,
} from "@/lib/ops/media-collections/midnight-special/performances";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 404 });
  }

  const index = await loadPerformanceIndex();
  return NextResponse.json({ ok: true, index });
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 404 });
  }

  let action: string | undefined;
  try {
    const body = (await req.json()) as { action?: string };
    action = body.action;
  } catch {
    action = new URL(req.url).searchParams.get("action") ?? undefined;
  }

  if (action === "generate") {
    const result = await generateAllPerformanceCandidates();
    const index = await loadPerformanceIndex();
    return NextResponse.json({ ok: true, result, index });
  }

  if (action === "accept_exact") {
    const result = await acceptAllExactMatches();
    const index = await loadPerformanceIndex();
    return NextResponse.json({ ok: true, result, index });
  }

  return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
}
