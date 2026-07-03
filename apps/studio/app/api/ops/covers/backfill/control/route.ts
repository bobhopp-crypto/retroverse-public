import { NextResponse } from "next/server";

import { loadMissingCoverQueue } from "@/lib/covers/backfill/queue";
import { loadBackfillState, resetBackfillState, saveBackfillState } from "@/lib/covers/backfill/state";

function opsEnabled(): boolean {
  return process.env.RETROVERSE_OPS === "1";
}

type ControlAction = "pause" | "resume" | "reset";

export async function POST(req: Request) {
  if (!opsEnabled()) {
    return NextResponse.json({ ok: false, error: "Ops disabled" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const action =
    typeof body === "object" && body && "action" in body
      ? String((body as { action: unknown }).action).trim().toLowerCase()
      : "";

  if (action !== "pause" && action !== "resume" && action !== "reset") {
    return NextResponse.json(
      { ok: false, error: "action must be pause|resume|reset" },
      { status: 400 },
    );
  }

  try {
    const queue = await loadMissingCoverQueue();
    let state =
      action === "reset"
        ? await resetBackfillState(queue.length)
        : await loadBackfillState(queue.length);

    if (action === "pause") {
      state.paused = true;
      state.running = false;
      await saveBackfillState(state);
    } else if (action === "resume") {
      state.paused = false;
      await saveBackfillState(state);
    }

    return NextResponse.json({ ok: true, action: action as ControlAction, state });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
