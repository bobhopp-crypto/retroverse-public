import { NextResponse } from "next/server";

import { loadCockpitState, patchCockpitState, saveCockpitState } from "@/lib/bobos/cockpit/store";
import type { CockpitPatch } from "@/lib/bobos/cockpit/store";
import type { CockpitState } from "@/lib/bobos/cockpit/types";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }
  const state = await loadCockpitState();
  return NextResponse.json({ state });
}

export async function PUT(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }
  try {
    const body = (await req.json()) as { state?: CockpitState };
    if (!body.state) {
      return NextResponse.json({ error: "Missing state" }, { status: 400 });
    }
    const state = await saveCockpitState(body.state);
    return NextResponse.json({ state });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save cockpit state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }
  try {
    const patch = (await req.json()) as CockpitPatch;
    if (!patch?.type) {
      return NextResponse.json({ error: "Missing patch type" }, { status: 400 });
    }
    const state = await patchCockpitState(patch);
    return NextResponse.json({ state });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not patch cockpit state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
