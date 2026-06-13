import { NextResponse } from "next/server";

import { loadEventControlConfig, saveEventControlConfig } from "@/lib/ops/event-control/store";
import type { EventControlSavePayload } from "@/lib/ops/event-control/types";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  const config = await loadEventControlConfig();
  return NextResponse.json({ config });
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as Partial<EventControlSavePayload>;
  if (!payload.event || !Array.isArray(payload.featuredYears) || !payload.homepage) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const rvbr = payload.rvbr ?? {};

  try {
    const config = await saveEventControlConfig({
      event: payload.event,
      featuredYears: payload.featuredYears,
      homepage: payload.homepage,
      rvbr: rvbr as EventControlSavePayload["rvbr"],
    });
    return NextResponse.json({ config });
  } catch (err) {
    console.error("[ops/event-control] save failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 },
    );
  }
}
