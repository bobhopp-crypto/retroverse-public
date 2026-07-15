import { isFreshBridgeLiveSelection } from "@/lib/sunday-nights/live-freshness";
import type { SundayNightsState } from "@/lib/sunday-nights/types";

import { resolveTop10Songs1969Item } from "./resolve-scheduled-item";
import { channelZeroSongExperienceHref } from "./song-experience-href";
import type { ChannelZeroExperience, ChannelZeroResolveInput } from "./types";

const DEFAULT_BROADCAST_RVTR = "RVTR708312";
const RE_RVTR = /^RVTR\d{6}$/i;

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function songExperience(
  rvtr: string,
  input: {
    source: ChannelZeroExperience["source"];
    reason: string;
    selectedAt: string;
    validUntil: string;
    metadata?: Partial<ChannelZeroExperience["metadata"]>;
  },
): ChannelZeroExperience {
  const experienceId = rvtr.trim().toUpperCase();
  const { metadata: partial, ...rest } = input;
  return {
    experienceType: "song",
    experienceId,
    metadata: {
      href: channelZeroSongExperienceHref(experienceId),
      ...partial,
    },
    ...rest,
  };
}

function normalizeRvtr(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim().toUpperCase();
  return RE_RVTR.test(trimmed) ? trimmed : null;
}

function matchedRvtrFromState(state: SundayNightsState): string | null {
  const fromLive = normalizeRvtr(state.live?.rvtr);
  if (fromLive) return fromLive;
  return normalizeRvtr(state.currentTrackId);
}

function resolveTakeover(
  state: SundayNightsState,
  nowMs: number,
): ChannelZeroExperience | null {
  if (!state.vdjTakeoverActive) return null;
  if (!isFreshBridgeLiveSelection(state, nowMs)) return null;

  const rvtr = matchedRvtrFromState(state);
  if (!rvtr) return null;

  const selectedAt =
    state.live?.bridgeTimestamp?.trim() || state.updatedAt || iso(nowMs);

  return songExperience(rvtr, {
    source: "takeover",
    reason: "VirtualDJ takeover is active with a fresh matched live signal.",
    selectedAt,
    validUntil: iso(nowMs + 90_000),
    metadata: {
      takeoverActive: true,
      liveBridgeTimestamp: state.live?.bridgeTimestamp ?? null,
    },
  });
}

function resolveLiveSignal(
  state: SundayNightsState,
  nowMs: number,
): ChannelZeroExperience | null {
  if (!isFreshBridgeLiveSelection(state, nowMs)) return null;

  const rvtr = matchedRvtrFromState(state);
  if (!rvtr) return null;

  const selectedAt =
    state.live?.bridgeTimestamp?.trim() || state.updatedAt || iso(nowMs);

  return songExperience(rvtr, {
    source: "live-signal",
    reason: "Fresh VirtualDJ bridge signal with a matched RVTR.",
    selectedAt,
    validUntil: iso(nowMs + 90_000),
    metadata: {
      liveBridgeTimestamp: state.live?.bridgeTimestamp ?? null,
      takeoverActive: state.vdjTakeoverActive === true,
    },
  });
}

function resolveScheduledExperience(nowMs: number): ChannelZeroExperience {
  const slot = resolveTop10Songs1969Item(nowMs);

  return songExperience(slot.rvtr, {
    source: "scheduled",
    reason: `Scheduled program "${slot.programId}" item ${slot.itemIndex + 1}.`,
    selectedAt: iso(slot.slotStartMs),
    validUntil: iso(slot.slotEndMs),
    metadata: {
      programId: slot.programId,
      programItemIndex: slot.itemIndex,
      programItemCount: 10,
    },
  });
}

export function resolveDefaultBroadcast(
  nowMs: number,
  defaultRvtr: string,
): ChannelZeroExperience {
  const experienceId = defaultRvtr.trim().toUpperCase();

  return songExperience(experienceId, {
    source: "default-broadcast",
    reason: "Default broadcast recommendation when no higher-priority source is active.",
    selectedAt: iso(nowMs),
    validUntil: iso(nowMs + 60_000),
    metadata: {
      defaultRvtr: experienceId,
      href: channelZeroSongExperienceHref(experienceId),
    },
  });
}

/**
 * Channel Zero — resolves exactly one canonical public Experience.
 *
 * Priority: Takeover → Live Signal → Scheduled Experience → Default Broadcast.
 */
export function resolveChannelExperience(input: ChannelZeroResolveInput): ChannelZeroExperience {
  const nowMs = input.nowMs ?? Date.now();
  const state = input.state;
  const defaultRvtr = (input.defaultRvtr ?? DEFAULT_BROADCAST_RVTR).trim().toUpperCase();

  const takeover = resolveTakeover(state, nowMs);
  if (takeover) return takeover;

  const live = resolveLiveSignal(state, nowMs);
  if (live) return live;

  return resolveScheduledExperience(nowMs);
}

export { DEFAULT_BROADCAST_RVTR };
