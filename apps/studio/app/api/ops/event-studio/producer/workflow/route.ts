import { NextResponse } from "next/server";

import { loadProducerWorkflow } from "@/lib/ops/event-studio/producer/workflow";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  try {
    const workflow = await loadProducerWorkflow();
    return NextResponse.json({ ok: true, workflow });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Load failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
