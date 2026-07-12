import type { SundayNightsLiveSelection, SundayNightsState } from "./types";

export const LIVE_BRIDGE_FRESHNESS_MS = 90_000;

function timestampMs(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isFreshBridgeLiveSelection(
  state: SundayNightsState,
  nowMs = Date.now(),
): boolean {
  if (state.live?.source !== "bridge" || state.bridgePlaying !== true) return false;

  const timestamp =
    timestampMs(state.live.bridgeTimestamp) ?? timestampMs(state.updatedAt);

  return timestamp !== null && nowMs - timestamp <= LIVE_BRIDGE_FRESHNESS_MS;
}

export function currentLiveSelection(
  state: SundayNightsState,
  nowMs = Date.now(),
): SundayNightsLiveSelection | null {
  if (state.live?.source !== "bridge") return state.live;
  return isFreshBridgeLiveSelection(state, nowMs) ? state.live : null;
}
