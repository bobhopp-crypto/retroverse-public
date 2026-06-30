import { randomUUID } from "crypto";

import { countUniqueEntries, listGiveawayEntries } from "./entries";
import {
  getActiveGiveaway,
  loadGiveawayStudioState,
  saveGiveawayStudioState,
  updateGiveawayInState,
} from "./store";
import type { GiveawayDrawRecord, GiveawayDrawStatus, GiveawayEntry, GiveawayStudioState } from "./types";

function eligibleEntries(entries: GiveawayEntry[], draws: GiveawayDrawRecord[], giveawayId: string): GiveawayEntry[] {
  const disqualified = new Set(
    draws
      .filter((draw) => draw.giveawayId === giveawayId && draw.status === "disqualified")
      .map((draw) => draw.entryId),
  );
  const completed = new Set(
    draws
      .filter((draw) => draw.giveawayId === giveawayId && draw.status === "completed")
      .map((draw) => draw.entryId),
  );

  return entries.filter(
    (entry) =>
      entry.giveawayId === giveawayId &&
      !entry.duplicateOf &&
      !disqualified.has(entry.id) &&
      !completed.has(entry.id),
  );
}

export function getCurrentDraw(
  state: GiveawayStudioState,
  giveawayId: string,
): GiveawayDrawRecord | null {
  return (
    [...state.draws]
      .filter((draw) => draw.giveawayId === giveawayId)
      .sort((a, b) => b.drawnAt.localeCompare(a.drawnAt))
      .find((draw) => draw.status === "pending" || draw.status === "claimed" || draw.status === "not_present") ??
    null
  );
}

export async function drawGiveawayWinner(giveawayId: string, eventKey: string): Promise<{
  state: GiveawayStudioState;
  draw: GiveawayDrawRecord;
  winner: GiveawayEntry;
}> {
  const state = await loadGiveawayStudioState(eventKey);
  const entries = await listGiveawayEntries(eventKey, giveawayId);
  const pool = eligibleEntries(entries, state.draws, giveawayId);

  if (pool.length === 0) {
    throw new Error("No eligible entries available for drawing");
  }

  const winner = pool[Math.floor(Math.random() * pool.length)]!;
  const draw: GiveawayDrawRecord = {
    id: randomUUID(),
    giveawayId,
    entryId: winner.id,
    drawnAt: new Date().toISOString(),
    status: "pending",
    notes: "",
  };

  const next: GiveawayStudioState = {
    ...updateGiveawayInState(state, giveawayId, { status: "drawing" }),
    draws: [draw, ...state.draws],
  };

  await saveGiveawayStudioState(next);
  return { state: next, draw, winner };
}

export async function updateGiveawayDrawStatus(input: {
  eventKey: string;
  drawId: string;
  status: GiveawayDrawStatus;
  notes?: string;
}): Promise<{ state: GiveawayStudioState; draw: GiveawayDrawRecord }> {
  const state = await loadGiveawayStudioState(input.eventKey);
  const draw = state.draws.find((entry) => entry.id === input.drawId);
  if (!draw) throw new Error("Draw not found");

  const nextDraw: GiveawayDrawRecord = {
    ...draw,
    status: input.status,
    notes: input.notes?.trim() ?? draw.notes,
  };

  let nextState: GiveawayStudioState = {
    ...state,
    draws: state.draws.map((entry) => (entry.id === input.drawId ? nextDraw : entry)),
  };

  if (input.status === "completed") {
    nextState = updateGiveawayInState(nextState, draw.giveawayId, { status: "completed" });
  } else if (input.status === "redrawn" || input.status === "disqualified" || input.status === "not_present") {
    nextState = updateGiveawayInState(nextState, draw.giveawayId, { status: "live" });
  } else if (input.status === "claimed") {
    nextState = updateGiveawayInState(nextState, draw.giveawayId, { status: "drawing" });
  }

  await saveGiveawayStudioState(nextState);
  return { state: nextState, draw: nextDraw };
}

export async function resolveWinnerEntry(
  eventKey: string,
  draw: GiveawayDrawRecord | null,
): Promise<GiveawayEntry | null> {
  if (!draw) return null;
  const entries = await listGiveawayEntries(eventKey, draw.giveawayId);
  return entries.find((entry) => entry.id === draw.entryId) ?? null;
}

export async function loadGiveawayDrawingContext(eventKey: string) {
  const state = await loadGiveawayStudioState(eventKey);
  const active = getActiveGiveaway(state);
  if (!active) {
    return { state, active: null, currentDraw: null, currentWinner: null, eligibleCount: 0 };
  }
  const entries = await listGiveawayEntries(eventKey, active.id);
  const currentDraw = getCurrentDraw(state, active.id);
  const currentWinner = await resolveWinnerEntry(eventKey, currentDraw);
  const eligibleCount = eligibleEntries(entries, state.draws, active.id).length;
  return { state, active, currentDraw, currentWinner, eligibleCount };
}
