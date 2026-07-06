"use server";

import {
  buildPlayheadPayload,
  createPresentation,
  getPresentation,
  loadPresentationState,
  movePlayhead,
  publishPresentation,
  saveDraft,
  savePresentationState,
  syncBroadcast,
} from "@/lib/bobos/presentation/store";
import { enabledItems } from "@/lib/bobos/presentation/resolve-playhead";
import { publicSiteBaseUrl } from "@/lib/bobos/presentation/push-public";
import {
  newPresentationItem,
  type PlayheadCommand,
  type PlayheadPayload,
  type Presentation,
  type PresentationItem,
  type PresentationItemType,
} from "@/lib/bobos/presentation/types";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

function assertLocalStudio() {
  if (!shouldAllowOpsRoutes()) {
    throw new Error("Broadcast Panel is localhost-only.");
  }
}

/* ── Status ── */

export type PublicSyncState = "synced" | "drift" | "unreachable" | "unconfigured" | "off-air";

export type BroadcastStatus = {
  local: PlayheadPayload;
  publicSync: { state: PublicSyncState; detail: string; checkedAt: string };
  publicPlayerUrl: string;
};

type PublicCheck = BroadcastStatus["publicSync"];

// The public site is polled at most once per TTL; the panel polls every 2s
// but a fetch to retroverse.live on each tick would be wasteful.
const PUBLIC_CHECK_TTL_MS = 10_000;
let publicCheckCache: { at: number; result: PublicCheck } | null = null;

async function checkPublicSync(local: PlayheadPayload, force: boolean): Promise<PublicCheck> {
  const now = Date.now();
  if (!force && publicCheckCache && now - publicCheckCache.at < PUBLIC_CHECK_TTL_MS) {
    return publicCheckCache.result;
  }

  const checkedAt = new Date().toISOString();
  let result: PublicCheck;

  if (!process.env.LIVE_NOW_PLAYING_SECRET?.trim()) {
    result = {
      state: "unconfigured",
      detail: "LIVE_NOW_PLAYING_SECRET not set — public push disabled",
      checkedAt,
    };
  } else {
    const url = `${publicSiteBaseUrl()}/api/retroverse-live/playhead`;
    try {
      const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4000) });
      if (!res.ok) {
        result = { state: "unreachable", detail: `HTTP ${res.status} from ${url}`, checkedAt };
      } else {
        const payload = (await res.json()) as PlayheadPayload;
        if (!payload.onAir && !local.onAir) {
          result = { state: "off-air", detail: "Both sites off air", checkedAt };
        } else if (payload.item?.id === local.item?.id && payload.mode === local.mode) {
          result = { state: "synced", detail: "Public playhead matches local", checkedAt };
        } else {
          result = {
            state: "drift",
            detail: `Public shows "${payload.item?.title ?? "off air"}"`,
            checkedAt,
          };
        }
      }
    } catch (error) {
      result = {
        state: "unreachable",
        detail: error instanceof Error ? error.message : String(error),
        checkedAt,
      };
    }
  }

  publicCheckCache = { at: now, result };
  return result;
}

export async function getBroadcastStatus(options?: {
  forcePublicCheck?: boolean;
}): Promise<BroadcastStatus> {
  assertLocalStudio();
  const local = await buildPlayheadPayload();
  const publicSync = await checkPublicSync(local, options?.forcePublicCheck ?? false);
  return {
    local,
    publicSync,
    publicPlayerUrl: `${publicSiteBaseUrl()}/`,
  };
}

/* ── Transport ── */

export async function broadcastTransport(command: PlayheadCommand): Promise<BroadcastStatus> {
  assertLocalStudio();
  await movePlayhead(command, "cockpit");
  return getBroadcastStatus({ forcePublicCheck: true });
}

export async function setBroadcastAutoFollowVdj(enabled: boolean): Promise<BroadcastStatus> {
  assertLocalStudio();
  const { setAutoFollowVdj } = await import("@/lib/bobos/presentation/vdj-takeover");
  await setAutoFollowVdj(enabled);
  return getBroadcastStatus({ forcePublicCheck: true });
}

/* ── Queue editing (controller-level: titles and order only, no slide editing) ── */

export type BroadcastQueueOp =
  | { type: "add"; title: string; itemType: PresentationItemType }
  | { type: "remove"; itemId: string }
  | { type: "toggle"; itemId: string }
  | { type: "move"; itemId: string; direction: "up" | "down" };

async function getActivePresentation(): Promise<Presentation | null> {
  const state = await loadPresentationState();
  if (!state.activePresentationId) return null;
  return getPresentation(state.activePresentationId);
}

function applyQueueOp(items: PresentationItem[], op: BroadcastQueueOp): PresentationItem[] {
  switch (op.type) {
    case "add": {
      const item = newPresentationItem(op.itemType);
      item.title = op.title.trim() || item.title;
      return [...items, item];
    }
    case "remove":
      return items.filter((item) => item.id !== op.itemId);
    case "toggle":
      return items.map((item) =>
        item.id === op.itemId ? { ...item, enabled: !item.enabled } : item,
      );
    case "move": {
      const index = items.findIndex((item) => item.id === op.itemId);
      const target = op.direction === "up" ? index - 1 : index + 1;
      if (index === -1 || target < 0 || target >= items.length) return items;
      const next = [...items];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    }
  }
}

/**
 * Edit the on-air queue. Works on the active presentation's draft queue,
 * then republishes so the change hits the audience immediately.
 */
export async function broadcastQueueOp(op: BroadcastQueueOp): Promise<BroadcastStatus> {
  assertLocalStudio();
  const presentation = await getActivePresentation();
  if (!presentation) return getBroadcastStatus();

  const nextItems = applyQueueOp(presentation.queue.items, op);
  await saveDraft(presentation.id, {
    title: presentation.title,
    description: presentation.description,
    queue: { ...presentation.queue, items: nextItems },
  });
  await publishPresentation(presentation.id);
  return getBroadcastStatus({ forcePublicCheck: true });
}

/* ── Broadcast Source ── */

export type BroadcastSourceRefreshResult = BroadcastStatus & {
  itemCount: number;
  source: string;
};

/**
 * Rebuild the broadcast queue from VirtualDJ's database.xml.
 * Filters: video files, PlayCount >= 5, valid Artist+Title, no duplicates.
 * Each song gets a 45-second slot via the Universal Renderer.
 */
export async function refreshBroadcastFromDatabaseXml(options?: {
  songDurationSeconds?: number;
}): Promise<BroadcastSourceRefreshResult> {
  assertLocalStudio();

  const { buildDatabaseXmlBroadcastQueue } = await import(
    "@/lib/broadcast-source/database-xml"
  );
  const { DEFAULT_BROADCAST_SOURCE } = await import("@/lib/broadcast-source/types");

  const config = {
    ...DEFAULT_BROADCAST_SOURCE,
    songDurationSeconds: options?.songDurationSeconds ?? DEFAULT_BROADCAST_SOURCE.songDurationSeconds,
  };

  const newQueue = await buildDatabaseXmlBroadcastQueue(config);
  if (newQueue.items.length === 0) {
    throw new Error(
      "No eligible video tracks in database.xml (video, PlayCount ≥ 5, Artist+Title required).",
    );
  }

  let presentation = await getActivePresentation();
  if (!presentation) {
    presentation = await createPresentation("Retroverse Broadcast");
  }

  const draft = await saveDraft(presentation.id, {
    title: presentation.title,
    description: presentation.description,
    queue: newQueue,
  });
  if (!draft) {
    throw new Error(`Failed to save broadcast queue draft for presentation ${presentation.id}.`);
  }

  const published = await publishPresentation(presentation.id);
  if (!published?.published) {
    throw new Error(`Failed to publish broadcast queue for presentation ${presentation.id}.`);
  }

  // publishPresentation skips playhead re-anchor when the same presentation stays on air.
  // A source refresh replaces every queue item — re-anchor and re-sync the snapshot so
  // Broadcast Desk / playhead payload reflect the new VDJ queue immediately.
  const state = await loadPresentationState();
  const firstEnabled = enabledItems(newQueue)[0] ?? null;
  const now = new Date().toISOString();
  state.playhead = {
    presentationId: presentation.id,
    anchorItemId: firstEnabled?.id ?? null,
    anchorStartedAt: now,
    mode: firstEnabled ? "playing" : "paused",
    movedBy: "system",
    updatedAt: now,
  };
  state.broadcastSourceMeta = {
    id: config.id,
    itemCount: newQueue.items.length,
    generatedAt: now,
    songDurationSeconds: config.songDurationSeconds,
  };
  await savePresentationState(state);
  await syncBroadcast();

  const status = await getBroadcastStatus({ forcePublicCheck: true });
  return { ...status, itemCount: newQueue.items.length, source: config.id };
}

/* ── Seeding ── */

const SEED_ITEMS: { type: PresentationItemType; title: string; subtitle: string }[] = [
  { type: "slide", title: "Welcome", subtitle: "Retroverse Live" },
  { type: "artist", title: "Status Quo", subtitle: "" },
  { type: "artist", title: "Queen", subtitle: "" },
  { type: "artist", title: "David Bowie", subtitle: "" },
  { type: "announcement", title: "Giveaway", subtitle: "Register your pass to enter" },
];

/** Create and publish the default broadcast when nothing is on air yet. */
export async function seedDefaultBroadcast(): Promise<BroadcastStatus> {
  assertLocalStudio();
  const existing = await getActivePresentation();
  if (existing?.published) return getBroadcastStatus();

  const presentation = existing ?? (await createPresentation("Retroverse Broadcast"));
  const items = SEED_ITEMS.map((seed) => {
    const item = newPresentationItem(seed.type);
    item.title = seed.title;
    item.subtitle = seed.subtitle;
    return item;
  });
  await saveDraft(presentation.id, {
    title: presentation.title,
    description: presentation.description,
    queue: { items, loop: true },
  });
  await publishPresentation(presentation.id);
  return getBroadcastStatus({ forcePublicCheck: true });
}
