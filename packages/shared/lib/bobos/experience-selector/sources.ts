import "server-only";

import { normalizePlayheadPayload } from "@/lib/broadcast/normalize-playhead";
import type {
  PlayheadPayloadCore,
  PlayheadVdjState,
  PresentationItem,
} from "@/lib/bobos/presentation/types";
import {
  buildPlayheadVdjStateFromSundayNights,
  buildVdjPresentationItem,
  VDJ_LIVE_ITEM_ID,
} from "@/lib/bobos/presentation/vdj-takeover";
import { currentLiveSelection } from "@/lib/sunday-nights/live-freshness";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";
import { loadMixerState } from "@/lib/bobos/mixer/store";
import { deckPlaylistToQueue } from "@/lib/bobos/mixer/playback-adapter";
import { loadPresentationState } from "@/lib/bobos/presentation/store";
import { resolvePlayhead } from "@/lib/bobos/presentation/resolve-playhead";
import { loadBroadcastSnapshot } from "@/lib/bobos/presentation/broadcast-snapshot";

import {
  EXPERIENCE_NAMES,
  type Experience,
  type ExperienceId,
} from "./types";

const EMPTY_VDJ: PlayheadVdjState = {
  playing: false,
  rvtr: null,
  takeoverActive: false,
  resumeBroadcastAt: null,
};

function stageItem(
  id: string,
  type: PresentationItem["type"],
  title: string,
  subtitle: string,
  body = "",
): PresentationItem {
  return {
    id,
    type,
    title,
    subtitle,
    body,
    enabled: true,
    durationSeconds: 0,
    transition: "cut",
    trigger: "manual",
    link: null,
    countdownTarget: null,
    notes: "",
    mediaUrl: null,
    mediaWidth: null,
    mediaHeight: null,
  };
}

function toExperience(
  id: ExperienceId,
  available: boolean,
  item: PresentationItem | null,
  now: Date,
  extras?: Partial<PlayheadPayloadCore>,
): Experience {
  const core: PlayheadPayloadCore = {
    onAir: available && item != null,
    presentation: extras?.presentation ?? null,
    item,
    itemIndex: extras?.itemIndex ?? (item ? 0 : -1),
    itemCount: extras?.itemCount ?? (item ? 1 : 0),
    mode: extras?.mode ?? "paused",
    elapsedSeconds: extras?.elapsedSeconds ?? 0,
    nextItem: extras?.nextItem ?? null,
    queue: extras?.queue ?? null,
    publishedAt: extras?.publishedAt ?? null,
    updatedAt: extras?.updatedAt ?? now.toISOString(),
    autoFollowVdj: false,
    manualTakeActive: true,
    vdj: extras?.vdj ?? EMPTY_VDJ,
  };
  const payload = normalizePlayheadPayload(core, now);
  return {
    id,
    name: EXPERIENCE_NAMES[id],
    available,
    payload: {
      rvba: payload.rvba,
      broadcast: payload.broadcast,
    },
    playhead: core,
    queue: extras?.queue ?? null,
  };
}

async function programExperience(now: Date): Promise<Experience> {
  const mixer = await loadMixerState();
  const deck = mixer.left;
  const localQueue = await deckPlaylistToQueue(deck, mixer.autoAdvanceSeconds);
  const presentationState = await loadPresentationState();
  const publicSnapshot = localQueue.items.length ? null : await loadBroadcastSnapshot();
  const queue = publicSnapshot?.queue ?? localQueue;
  const playhead = publicSnapshot?.playhead ?? presentationState.playhead;
  const resolved = resolvePlayhead(queue, playhead, now);
  const fallbackIndex = queue.items.length
    ? Math.min(Math.max(0, deck.currentIndex), queue.items.length - 1)
    : -1;
  const itemIndex = resolved.available ? resolved.index : fallbackIndex;
  const item = resolved.available ? resolved.item : itemIndex >= 0 ? queue.items[itemIndex] ?? null : null;
  const nextItem = itemIndex >= 0 ? queue.items[itemIndex + 1] ?? null : null;

  return toExperience("program", item != null, item, now, {
    presentation: item ? { id: publicSnapshot?.presentationId ?? "broadcast-mixer-program", title: "Program" } : null,
    itemIndex,
    itemCount: queue.items.length,
    mode: resolved.available ? playhead.mode : "paused",
    elapsedSeconds: resolved.available ? resolved.elapsedSeconds : 0,
    nextItem,
    queue,
    publishedAt: null,
    updatedAt: now.toISOString(),
  });
}

async function virtualdjExperience(now: Date): Promise<Experience> {
  // Refresh live-control / bridge before snapshot — avoid stale Sunday Nights cache.
  try {
    const { tickLiveControl } = await import("@/lib/live-control/engine");
    await tickLiveControl();
  } catch {
    // Bridge tick is best-effort; still read whatever state we have.
  }

  const sn = await loadSundayNightsState();
  const vdj = buildPlayheadVdjStateFromSundayNights(sn);
  // Use the fresh bridge selection while VDJ is reporting. If the bridge
  // pauses, disconnects, or stops, retain the last known track so the
  // selected input remains a stable audience source until another input is
  // clicked.
  const freshLive = currentLiveSelection(sn, now.getTime());
  const cachedLive = sn.live?.title?.trim() && sn.live?.artist?.trim() ? sn.live : null;
  const live = freshLive ?? cachedLive;
  const hasIdentity = Boolean(live?.title?.trim() && live?.artist?.trim());
  if (!hasIdentity || !live) {
    return toExperience("virtualdj", false, null, now, { vdj });
  }

  const item = buildVdjPresentationItem(live);
  // Stable id alone caches the stage; stamp track identity so previews remount on change.
  const trackStamp =
    live.rvtr?.trim() ||
    live.songKey?.trim() ||
    `${live.artist.trim()}|${live.title.trim()}`;
  item.id = `${VDJ_LIVE_ITEM_ID}:${trackStamp}`;
  let elapsedSeconds = 0;
  const startedAt = freshLive?.bridgeTimestamp?.trim();
  if (startedAt && (vdj.playing || sn.bridgePlaying === true)) {
    elapsedSeconds = Math.max(0, Math.floor((now.getTime() - Date.parse(startedAt)) / 1000));
  }

  return toExperience("virtualdj", true, item, now, {
    itemIndex: -1,
    mode: freshLive && (vdj.playing || sn.bridgePlaying === true) ? "playing" : "paused",
    elapsedSeconds,
    vdj: {
      ...vdj,
      playing: Boolean(freshLive && (vdj.playing || sn.bridgePlaying === true)),
      rvtr: live.rvtr?.trim() || vdj.rvtr,
    },
    updatedAt: live.bridgeTimestamp?.trim() || sn.updatedAt || now.toISOString(),
  });
}

async function stageExperience(
  id: "announcement" | "giveaway",
  now: Date,
): Promise<Experience> {
  // AUX inputs are independent workspaces. They never read or borrow the
  // Program queue; future drag/drop mutations will update only this input.
  const isAuxOne = id === "announcement";
  const item = stageItem(
    isAuxOne ? "aux-1-ready" : "aux-2-ready",
    "announcement",
    isAuxOne ? "AUX 1 Ready" : "AUX 2 Ready",
    "Retroverse",
    isAuxOne ? "AUX 1 queue" : "AUX 2 queue",
  );
  const experience = toExperience(id, true, item, now, {
    presentation: {
      id: isAuxOne ? "aux-1" : "aux-2",
      title: isAuxOne ? "AUX 1" : "AUX 2",
    },
    itemIndex: 0,
    itemCount: 1,
    mode: "paused",
    queue: { items: [item], loop: true },
  });
  if (experience.payload.rvba) {
    return {
      ...experience,
      payload: {
        ...experience.payload,
        rvba: { ...experience.payload.rvba, type: "giveaway" },
        broadcast: experience.payload.broadcast
          ? { ...experience.payload.broadcast, type: "giveaway" }
          : null,
      },
    };
  }
  return experience;
}

/** Snapshot every experience in the common shape. */
export async function getAllExperiences(now: Date = new Date()): Promise<Experience[]> {
  const [program, virtualdj, announcement, giveaway] = await Promise.all([
    programExperience(now),
    virtualdjExperience(now),
    stageExperience("announcement", now),
    stageExperience("giveaway", now),
  ]);
  return [program, virtualdj, announcement, giveaway];
}

export async function getExperience(
  id: ExperienceId,
  now: Date = new Date(),
): Promise<Experience> {
  switch (id) {
    case "program":
      return programExperience(now);
    case "virtualdj":
      return virtualdjExperience(now);
    case "announcement":
      return stageExperience("announcement", now);
    case "giveaway":
      return stageExperience("giveaway", now);
  }
}
