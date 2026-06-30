import { NextResponse } from "next/server";

import { loadEventControlConfig } from "@/lib/ops/event-control/store";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import { slugifyEventKey } from "@/lib/ops/event-studio/giveaway/event-key";
import { loadGiveawayStudio } from "@/lib/ops/event-studio/giveaway/load-giveaway-studio";
import {
  getActiveGiveaway,
  loadGiveawayStudioState,
  saveGiveawayStudioState,
  updateGiveawayInState,
} from "@/lib/ops/event-studio/giveaway/store";
import type {
  GiveawaySavePrizePayload,
  GiveawaySaveRegistrationPayload,
  GiveawaySaveSettingsPayload,
} from "@/lib/ops/event-studio/giveaway/types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  try {
    const snapshot = await loadGiveawayStudio();
    return NextResponse.json(snapshot);
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
    const body = (await req.json()) as {
      action?: string;
      payload?: GiveawaySavePrizePayload | GiveawaySaveRegistrationPayload | GiveawaySaveSettingsPayload;
    };

    const eventConfig = await loadEventControlConfig();
    const eventKey = slugifyEventKey(eventConfig.event.title);
    let state = await loadGiveawayStudioState(eventKey);

    if (body.action === "save-prize") {
      const payload = body.payload as GiveawaySavePrizePayload;
      state = updateGiveawayInState(state, payload.giveawayId, { prize: payload.prize });
    } else if (body.action === "save-registration") {
      const payload = body.payload as GiveawaySaveRegistrationPayload;
      state = updateGiveawayInState(state, payload.giveawayId, { registration: payload.registration });
    } else if (body.action === "save-settings") {
      const payload = body.payload as GiveawaySaveSettingsPayload;
      state = updateGiveawayInState(state, payload.giveawayId, {
        title: payload.title,
        status: payload.status,
        rules: payload.rules,
        scheduledDrawAt: payload.scheduledDrawAt,
      });
    } else if (body.action === "set-active") {
      const giveawayId = (body.payload as { giveawayId?: string } | undefined)?.giveawayId;
      if (!giveawayId || !state.giveaways.some((giveaway) => giveaway.id === giveawayId)) {
        return NextResponse.json({ error: "Invalid giveaway id" }, { status: 400 });
      }
      state = { ...state, activeGiveawayId: giveawayId };
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const saved = await saveGiveawayStudioState(state);
    const activeGiveaway = getActiveGiveaway(saved);
    return NextResponse.json({ ok: true, state: saved, activeGiveaway });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
