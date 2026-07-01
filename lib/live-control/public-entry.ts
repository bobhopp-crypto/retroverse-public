import { maybeAdvanceLiveChannel } from "@/lib/live-control/engine";
import { loadLiveControlState } from "@/lib/live-control/state";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";

import { liveSongExperienceHref } from "./experience-route";

const RE_RVTR = /^RVTR\d{6}$/i;

export function normalizeLiveRvtr(raw: string | null | undefined): string | null {
  const rvtr = raw?.trim().toUpperCase() ?? "";
  return RE_RVTR.test(rvtr) ? rvtr : null;
}

export function resolveActiveLiveRvtr(input: {
  currentTrackId: string | null;
  liveRvtr: string | null | undefined;
}): string | null {
  return normalizeLiveRvtr(input.currentTrackId) ?? normalizeLiveRvtr(input.liveRvtr);
}

/**
 * Public entry redirect for /live and /sunday-nights (and /retroverse-2/live).
 * Returns Song Experience href when the live channel has a resolved RVTR.
 * Do not call from `/` — the homepage stays on `/`.
 */
export async function getPublicLiveRedirectUrl(): Promise<string | null> {
  await maybeAdvanceLiveChannel();

  const [state, control] = await Promise.all([
    loadSundayNightsState(),
    loadLiveControlState(),
  ]);

  const rvtr = resolveActiveLiveRvtr({
    currentTrackId: state.currentTrackId,
    liveRvtr: state.live?.rvtr,
  });
  if (!rvtr) return null;

  if (control.running) {
    return liveSongExperienceHref(rvtr);
  }

  const source = state.live?.source;
  if (source === "channel" || source === "bridge") {
    return liveSongExperienceHref(rvtr);
  }

  return null;
}

export type PublicLiveEntrySnapshot = {
  redirectUrl: string | null;
  rvtr: string | null;
  channelRunning: boolean;
  liveSource: string | null;
  updatedAt: string;
};

export async function loadPublicLiveEntrySnapshot(): Promise<PublicLiveEntrySnapshot> {
  await maybeAdvanceLiveChannel();
  const [state, control] = await Promise.all([
    loadSundayNightsState(),
    loadLiveControlState(),
  ]);
  const rvtr = resolveActiveLiveRvtr({
    currentTrackId: state.currentTrackId,
    liveRvtr: state.live?.rvtr,
  });

  let redirectUrl: string | null = null;
  if (rvtr) {
    if (control.running || state.live?.source === "channel" || state.live?.source === "bridge") {
      redirectUrl = liveSongExperienceHref(rvtr);
    }
  }

  return {
    redirectUrl,
    rvtr,
    channelRunning: control.running,
    liveSource: state.live?.source ?? null,
    updatedAt: state.updatedAt,
  };
}
