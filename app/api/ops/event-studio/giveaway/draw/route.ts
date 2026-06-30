import { NextResponse } from "next/server";

import { loadEventControlConfig } from "@/lib/ops/event-control/store";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import { drawGiveawayWinner } from "@/lib/ops/event-studio/giveaway/draw";
import { slugifyEventKey } from "@/lib/ops/event-studio/giveaway/event-key";
import type { GiveawayDrawPayload } from "@/lib/ops/event-studio/giveaway/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  try {
    const payload = (await req.json()) as GiveawayDrawPayload;
    const eventConfig = await loadEventControlConfig();
    const eventKey = slugifyEventKey(eventConfig.event.title);
    const result = await drawGiveawayWinner(payload.giveawayId, eventKey);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Draw failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
