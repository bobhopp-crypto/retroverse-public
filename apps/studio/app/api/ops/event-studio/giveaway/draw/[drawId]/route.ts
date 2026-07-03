import { NextResponse } from "next/server";

import { loadEventControlConfig } from "@/lib/ops/event-control/store";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import { updateGiveawayDrawStatus } from "@/lib/ops/event-studio/giveaway/draw";
import { slugifyEventKey } from "@/lib/ops/event-studio/giveaway/event-key";
import type { GiveawayDrawUpdatePayload } from "@/lib/ops/event-studio/giveaway/types";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ drawId: string }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  try {
    const { drawId } = await context.params;
    const body = (await req.json()) as Omit<GiveawayDrawUpdatePayload, "drawId">;
    const eventConfig = await loadEventControlConfig();
    const eventKey = slugifyEventKey(eventConfig.event.title);
    const result = await updateGiveawayDrawStatus({
      eventKey,
      drawId,
      status: body.status,
      notes: body.notes,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
