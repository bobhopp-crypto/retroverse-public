import { cache } from "react";

import { loadEventControlConfig } from "@/lib/ops/event-control/store";

import { countDuplicateEntries, listGiveawayEntries } from "./entries";
import { getCurrentDraw, resolveWinnerEntry } from "./draw";
import { slugifyEventKey, giveawayRegistrationPath } from "./event-key";
import { createDefaultGiveaway } from "./defaults";
import { getActiveGiveaway, loadGiveawayStudioState, saveGiveawayStudioState } from "./store";
import type { GiveawayStudioSnapshot } from "./types";

export const loadGiveawayStudio = cache(async (): Promise<GiveawayStudioSnapshot> => {
  const eventConfig = await loadEventControlConfig();
  const eventKey = slugifyEventKey(eventConfig.event.title);
  const theme =
    eventConfig.rvbr.issueTheme?.trim() ||
    eventConfig.homepage.headline?.trim() ||
    eventConfig.event.title;

  let state = await loadGiveawayStudioState(eventKey);
  const active = getActiveGiveaway(state);
  if (active && active.title === `${eventKey} Giveaway` && active.prize.title.includes(eventKey)) {
    const seeded = createDefaultGiveaway(eventKey, eventConfig.event.title, theme);
    state = {
      ...state,
      giveaways: state.giveaways.map((giveaway) =>
        giveaway.id === active.id
          ? { ...seeded, id: giveaway.id, createdAt: giveaway.createdAt, status: giveaway.status }
          : giveaway,
      ),
    };
    state = await saveGiveawayStudioState(state);
  }

  const activeGiveaway = getActiveGiveaway(state);

  if (!activeGiveaway) {
    return {
      state,
      activeGiveaway: null,
      entries: [],
      entryCount: 0,
      recentEntries: [],
      duplicateCount: 0,
      currentDraw: null,
      currentWinner: null,
      registrationUrl: giveawayRegistrationPath(eventKey, "none"),
    };
  }

  const entries = await listGiveawayEntries(eventKey, activeGiveaway.id);
  const currentDraw = getCurrentDraw(state, activeGiveaway.id);
  const currentWinner = await resolveWinnerEntry(eventKey, currentDraw);

  return {
    state,
    activeGiveaway,
    entries,
    entryCount: entries.filter((entry) => !entry.duplicateOf).length,
    recentEntries: entries.slice(0, 12),
    duplicateCount: countDuplicateEntries(entries),
    currentDraw,
    currentWinner,
    registrationUrl: giveawayRegistrationPath(eventKey, activeGiveaway.id),
  };
});

export async function loadGiveawayStudioByEventKey(eventKey: string): Promise<GiveawayStudioSnapshot> {
  const state = await loadGiveawayStudioState(eventKey);
  const activeGiveaway = getActiveGiveaway(state);
  if (!activeGiveaway) {
    return {
      state,
      activeGiveaway: null,
      entries: [],
      entryCount: 0,
      recentEntries: [],
      duplicateCount: 0,
      currentDraw: null,
      currentWinner: null,
      registrationUrl: giveawayRegistrationPath(eventKey, "none"),
    };
  }
  const entries = await listGiveawayEntries(eventKey, activeGiveaway.id);
  const currentDraw = getCurrentDraw(state, activeGiveaway.id);
  const currentWinner = await resolveWinnerEntry(eventKey, currentDraw);
  return {
    state,
    activeGiveaway,
    entries,
    entryCount: entries.filter((entry) => !entry.duplicateOf).length,
    recentEntries: entries.slice(0, 12),
    duplicateCount: countDuplicateEntries(entries),
    currentDraw,
    currentWinner,
    registrationUrl: giveawayRegistrationPath(eventKey, activeGiveaway.id),
  };
}

/** @deprecated Use loadGiveawayStudioByEventKey */
export async function loadGiveawayStudioForEvent(eventTitle: string): Promise<GiveawayStudioSnapshot> {
  return loadGiveawayStudioByEventKey(slugifyEventKey(eventTitle));
}
