import { NextResponse } from "next/server";

import {
  normalizeProductionModuleStatus,
  type ProductionModuleId,
} from "@/lib/ops/event-studio/producer/module-status";
import { setModuleStatus } from "@/lib/ops/event-studio/producer/producer-state";
import { loadProducerWorkflow } from "@/lib/ops/event-studio/producer/workflow";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

const MODULE_IDS = new Set<ProductionModuleId>([
  "identity",
  "passes",
  "poster",
  "facebook",
  "homepage",
  "giveaway",
  "registration",
]);

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  try {
    const body = (await req.json()) as {
      moduleId?: string;
      status?: string;
    };

    if (!body.moduleId || !MODULE_IDS.has(body.moduleId as ProductionModuleId)) {
      return NextResponse.json({ error: "Invalid moduleId" }, { status: 400 });
    }

    const status = normalizeProductionModuleStatus(body.status);
    if (!status) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await setModuleStatus(body.moduleId as ProductionModuleId, status);
    const workflow = await loadProducerWorkflow();
    return NextResponse.json({ ok: true, workflow });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
