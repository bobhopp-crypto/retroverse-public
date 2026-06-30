import { NextResponse } from "next/server";

import { loadEventControlConfig } from "@/lib/ops/event-control/store";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import { addManualGiveawayEntry, listGiveawayEntries } from "@/lib/ops/event-studio/giveaway/entries";
import { slugifyEventKey } from "@/lib/ops/event-studio/giveaway/event-key";
import { getActiveGiveaway, loadGiveawayStudioState } from "@/lib/ops/event-studio/giveaway/store";
import type { GiveawayManualEntryPayload } from "@/lib/ops/event-studio/giveaway/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("q")?.trim() ?? "";
  const giveawayId = url.searchParams.get("giveawayId")?.trim();

  try {
    const eventConfig = await loadEventControlConfig();
    const eventKey = slugifyEventKey(eventConfig.event.title);
    const state = await loadGiveawayStudioState(eventKey);
    const active = getActiveGiveaway(state);
    const resolvedId = giveawayId || active?.id;
    if (!resolvedId) {
      return NextResponse.json({ entries: [], count: 0 });
    }

    const entries = await listGiveawayEntries(eventKey, resolvedId, search);
    return NextResponse.json({
      entries,
      count: entries.filter((entry) => !entry.duplicateOf).length,
      duplicateCount: entries.filter((entry) => entry.duplicateOf).length,
      search,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Load failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  try {
    const payload = (await req.json()) as GiveawayManualEntryPayload;
    const eventConfig = await loadEventControlConfig();
    const eventKey = slugifyEventKey(eventConfig.event.title);
    const state = await loadGiveawayStudioState(eventKey);
    const active = state.giveaways.find((giveaway) => giveaway.id === payload.giveawayId);
    if (!active) {
      return NextResponse.json({ error: "Giveaway not found" }, { status: 404 });
    }

    const result = await addManualGiveawayEntry(eventKey, payload, active.registration.fields);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Add entry failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
