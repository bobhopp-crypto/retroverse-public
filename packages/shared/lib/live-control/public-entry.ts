import { CANONICAL_AUDIENCE_HREF } from "@/lib/bobos/presentation/canonical-audience";
import { isLiveChannelSessionActive, tickLiveControl } from "@/lib/live-control/engine";
import { loadLiveControlState } from "@/lib/live-control/state";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";

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
 * Legacy live entry routes (/live, /sunday-nights, /retroverse-2/live,
 * /retroverse-live) all resolve to / — the canonical live broadcast.
 */
export async function getPublicLiveRedirectUrl(): Promise<string> {
  return CANONICAL_AUDIENCE_HREF;
}

export type PublicLiveEntrySnapshot = {
  redirectUrl: string;
  rvtr: string | null;
  channelRunning: boolean;
  liveSource: string | null;
  updatedAt: string;
};

export async function loadPublicLiveEntrySnapshot(): Promise<PublicLiveEntrySnapshot> {
  await tickLiveControl();
  const [state, control] = await Promise.all([
    loadSundayNightsState(),
    loadLiveControlState(),
  ]);
  const rvtr = resolveActiveLiveRvtr({
    currentTrackId: state.currentTrackId,
    liveRvtr: state.live?.rvtr,
  });

  return {
    redirectUrl: CANONICAL_AUDIENCE_HREF,
    rvtr,
    channelRunning: isLiveChannelSessionActive(control),
    liveSource: state.live?.source ?? null,
    updatedAt: state.updatedAt,
  };
}
