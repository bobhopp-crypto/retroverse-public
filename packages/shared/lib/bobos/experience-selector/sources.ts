import "server-only";

import { normalizePlayheadPayload } from "@/lib/broadcast/normalize-playhead";
import { loadBroadcastSnapshot } from "@/lib/bobos/presentation/broadcast-snapshot";
import { resolvePlayhead } from "@/lib/bobos/presentation/resolve-playhead";
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
  };
}

async function resolveProgramItem(now: Date): Promise<{
  item: PresentationItem | null;
  extras: Partial<PlayheadPayloadCore>;
}> {
  const snapshot = await loadBroadcastSnapshot();
  if (snapshot) {
    const resolved = resolvePlayhead(
      snapshot.queue,
      { ...snapshot.playhead, mode: "paused" },
      now,
    );
    return {
      item: resolved.item,
      extras: {
        presentation: { id: snapshot.presentationId, title: snapshot.title },
        itemIndex: resolved.index,
        itemCount: resolved.enabledCount,
        mode: "paused",
        elapsedSeconds: resolved.elapsedSeconds,
        queue: snapshot.queue,
        publishedAt: snapshot.publishedAt,
        updatedAt: snapshot.updatedAt,
      },
    };
  }

  // Dynamic import avoids cycle: presentation/store → resolve → sources.
  const { getPresentation, loadPresentationState } = await import(
    "@/lib/bobos/presentation/store"
  );
  const state = await loadPresentationState();
  const activeId = state.activePresentationId;
  const presentation = activeId ? await getPresentation(activeId) : null;
  const published = presentation?.published ?? null;
  if (!presentation || !published) {
    return { item: null, extras: { updatedAt: state.playhead.updatedAt } };
  }

  const resolved = resolvePlayhead(published.queue, state.playhead, now);
  return {
    item: resolved.item,
    extras: {
      presentation: { id: presentation.id, title: published.title },
      itemIndex: resolved.index,
      itemCount: resolved.enabledCount,
      mode: state.playhead.mode,
      elapsedSeconds: resolved.elapsedSeconds,
      queue: published.queue,
      publishedAt: published.publishedAt,
      updatedAt: state.playhead.updatedAt,
    },
  };
}

function findQueueItem(
  queue: { items: PresentationItem[] } | null | undefined,
  match: (item: PresentationItem) => boolean,
): PresentationItem | null {
  if (!queue) return null;
  return queue.items.find((item) => item.enabled && match(item)) ?? null;
}

async function programExperience(now: Date): Promise<Experience> {
  const { item, extras } = await resolveProgramItem(now);
  return toExperience("program", item != null, item, now, extras);
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
  // Fresh bridge selection only — never sticky/cached sn.live after stop or stale timestamp.
  const live = currentLiveSelection(sn, now.getTime());
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
  const startedAt = live.bridgeTimestamp?.trim();
  if (startedAt) {
    elapsedSeconds = Math.max(0, Math.floor((now.getTime() - Date.parse(startedAt)) / 1000));
  }

  return toExperience("virtualdj", true, item, now, {
    itemIndex: -1,
    mode: vdj.playing || sn.bridgePlaying === true ? "playing" : "paused",
    elapsedSeconds,
    vdj: {
      ...vdj,
      playing: vdj.playing || sn.bridgePlaying === true,
      rvtr: live.rvtr?.trim() || vdj.rvtr,
    },
    updatedAt: live.bridgeTimestamp?.trim() || sn.updatedAt || now.toISOString(),
  });
}

async function stageExperience(
  id: "announcement" | "giveaway",
  now: Date,
): Promise<Experience> {
  const { extras } = await resolveProgramItem(now);
  const queue = extras.queue;

  if (id === "announcement") {
    const fromQueue = findQueueItem(
      queue,
      (item) =>
        item.type === "announcement" ||
        item.title.toLowerCase().includes("announcement"),
    );
    const item =
      fromQueue ??
      stageItem(
        "experience-announcement",
        "announcement",
        "Announcement",
        "Retroverse",
        "Stand by for an announcement.",
      );
    return toExperience(id, true, item, now, {
      ...extras,
      itemIndex: 0,
      itemCount: 1,
      mode: "paused",
    });
  }

  const fromQueue = findQueueItem(
    queue,
    (item) =>
      item.title.toLowerCase().includes("giveaway") ||
      item.body.toLowerCase().includes("giveaway"),
  );
  const item =
    fromQueue ??
    stageItem(
      "experience-giveaway",
      "announcement",
      "Giveaway",
      "Retroverse",
      "Stand by for the giveaway.",
    );
  const experience = toExperience(id, true, item, now, {
    ...extras,
    itemIndex: 0,
    itemCount: 1,
    mode: "paused",
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
