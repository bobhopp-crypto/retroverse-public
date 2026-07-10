"use server";

import {
  buildPlayheadPayload,
  createPresentation,
  getPresentation,
  listPresentations,
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
  type PresentationQueue,
} from "@/lib/bobos/presentation/types";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";
import { deckPlaylistToQueue } from "@/lib/bobos/mixer/playback-adapter";
import { defaultPlaybackModeForCollection } from "@/lib/bobos/mixer/playback-defaults";
import {
  listMixerCollectionItems,
  listMixerCollections,
  sequenceToDeckEntries,
  type MixerCollectionItem,
} from "@/lib/bobos/mixer/collections";
import { loadMixerState, saveMixerState } from "@/lib/bobos/mixer/store";
import { RVBA_TEMPLATES } from "@/lib/bobos/mixer/rvba-templates";
import {
  formatAssetId,
  newDeckPlaylistEntry,
  type AssetKind,
  type AssetReference,
  type Deck,
  type DeckId,
  type MixerOutputId,
  type MixerState,
  type PlaybackMode,
} from "@/lib/bobos/mixer/types";
import {
  getCollectionManifest,
  importBroadcastCollection,
  updateCollectionSequences,
  type BroadcastCollectionManifest,
  type BroadcastSequence,
} from "@/lib/bobos/importer";

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
  // Broadcast Mixer / playhead payload reflect the new VDJ queue immediately.
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

/* ── Broadcast Mixer ──────────────────────────────────────────────────────
 *
 * Broadcast Mixer -> Deck Playlist -> Asset Reference -> Playback Engine.
 *
 * Everything below owns Deck/Asset Reference state (lib/bobos/mixer/*) and
 * only reaches into the Presentation engine (saveDraft/publishPresentation/
 * movePlayhead, all above) at the moment a deck needs to actually feed the
 * real Website output. The engine stays exactly as it was; this is the one
 * seam that drives it from the Mixer's playlist model instead of manual
 * queue editing.
 */

export async function getMixerState(): Promise<MixerState> {
  assertLocalStudio();
  return loadMixerState();
}

function deckOf(mixer: MixerState, deckId: DeckId): Deck {
  return mixer[deckId];
}

function applyCollectionPlaybackMode(deck: Deck, collectionId: string | null | undefined): void {
  if (!collectionId) return;
  deck.playbackMode = defaultPlaybackModeForCollection(collectionId);
}

/** Push a deck's current playlist to the on-air queue without changing which
 * deck is live — used after playlist edits so the audience stays in sync. */
async function republishIfLive(mixer: MixerState, deckId: DeckId): Promise<void> {
  if (mixer.liveDeckId !== deckId) return;
  const presentation = await getActivePresentation();
  if (!presentation) return;
  const deck = deckOf(mixer, deckId);
  await saveDraft(presentation.id, {
    title: presentation.title,
    description: presentation.description,
    queue: await deckPlaylistToQueue(deck, mixer.autoAdvanceSeconds),
  });
  await publishPresentation(presentation.id);
}

/**
 * Add an asset to a deck's playlist. Omitting `atIndex` appends to the end
 * (double-click behavior); passing an index inserts there (drag-and-drop
 * onto a specific playlist row).
 */
export async function addAssetToDeck(
  deckId: DeckId,
  asset: AssetReference,
  atIndex?: number,
): Promise<MixerState> {
  assertLocalStudio();
  const mixer = await loadMixerState();
  const deck = deckOf(mixer, deckId);
  const insertAt =
    atIndex == null || atIndex < 0 || atIndex > deck.playlist.length ? deck.playlist.length : atIndex;
  const next = [...deck.playlist];
  next.splice(insertAt, 0, newDeckPlaylistEntry(asset));
  if (next.length > 1 && insertAt <= deck.currentIndex) deck.currentIndex += 1;
  deck.playlist = next;
  if (deck.playlist.length === 1) deck.currentIndex = 0;
  await saveMixerState(mixer);
  await republishIfLive(mixer, deckId);
  return mixer;
}

/** Drag a Broadcast Sequence card onto a deck — inserts its slides without
 * replacing the rest of the playlist (unlike double-click, which loads the
 * sequence as the whole playlist via loadSequenceToDeck). */
export async function appendSequenceToDeck(
  deckId: DeckId,
  collectionId: string,
  sequenceId: string,
  atIndex?: number,
): Promise<MixerState> {
  assertLocalStudio();
  const entries = await sequenceToDeckEntries(collectionId, sequenceId);
  if (entries.length === 0) {
    throw new Error(`Unknown sequence: ${collectionId}/${sequenceId}`);
  }
  const mixer = await loadMixerState();
  const deck = deckOf(mixer, deckId);
  const insertAt =
    atIndex == null || atIndex < 0 || atIndex > deck.playlist.length ? deck.playlist.length : atIndex;
  const next = [...deck.playlist];
  next.splice(insertAt, 0, ...entries);
  if (next.length > entries.length && insertAt <= deck.currentIndex) deck.currentIndex += entries.length;
  deck.playlist = next;
  if (deck.currentIndex < 0 || deck.currentIndex >= deck.playlist.length) deck.currentIndex = 0;
  await saveMixerState(mixer);
  await republishIfLive(mixer, deckId);
  return mixer;
}

export async function removeDeckEntry(deckId: DeckId, entryId: string): Promise<MixerState> {
  assertLocalStudio();
  const mixer = await loadMixerState();
  const deck = deckOf(mixer, deckId);
  deck.playlist = deck.playlist.filter((entry) => entry.entryId !== entryId);
  if (deck.currentIndex >= deck.playlist.length) {
    deck.currentIndex = Math.max(0, deck.playlist.length - 1);
  }
  await saveMixerState(mixer);
  await republishIfLive(mixer, deckId);
  return mixer;
}

export async function reorderDeckEntry(
  deckId: DeckId,
  entryId: string,
  direction: "up" | "down",
): Promise<MixerState> {
  assertLocalStudio();
  const mixer = await loadMixerState();
  const deck = deckOf(mixer, deckId);
  const index = deck.playlist.findIndex((entry) => entry.entryId === entryId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= deck.playlist.length) return mixer;
  const next = [...deck.playlist];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  deck.playlist = next;
  await saveMixerState(mixer);
  await republishIfLive(mixer, deckId);
  return mixer;
}

/** Cue a playlist row locally. Jumps the real playhead too when this deck is live. */
export async function setDeckCue(deckId: DeckId, index: number): Promise<MixerState> {
  assertLocalStudio();
  const mixer = await loadMixerState();
  const deck = deckOf(mixer, deckId);
  if (index < 0 || index >= deck.playlist.length) return mixer;
  deck.currentIndex = index;
  await saveMixerState(mixer);
  if (mixer.liveDeckId === deckId) {
    await movePlayhead({ op: "jump", itemId: deck.playlist[index].entryId }, "cockpit");
  }
  return mixer;
}

export async function setDeckOutput(deckId: DeckId, output: MixerOutputId | null): Promise<MixerState> {
  assertLocalStudio();
  const mixer = await loadMixerState();
  deckOf(mixer, deckId).output = output;
  if (mixer.liveDeckId === deckId && output !== "website") {
    // Deck no longer targets the real output — release it and pause the engine.
    mixer.liveDeckId = null;
    await movePlayhead({ op: "pause" }, "cockpit");
  }
  await saveMixerState(mixer);
  return mixer;
}

/**
 * Play a deck: publish its playlist as the on-air queue and hand it the
 * real Website output. Hard-cutover model — this immediately takes the
 * output over from whichever deck was previously live.
 */
export async function playDeck(deckId: DeckId): Promise<{ mixer: MixerState; status: BroadcastStatus }> {
  assertLocalStudio();
  const mixer = await loadMixerState();
  const deck = deckOf(mixer, deckId);
  if (deck.playlist.length === 0) {
    throw new Error("Add an asset to this deck before pressing Play.");
  }
  if (deck.output !== "website") {
    throw new Error("Assign this deck to an output before pressing Play.");
  }
  if (deck.currentIndex < 0 || deck.currentIndex >= deck.playlist.length) {
    deck.currentIndex = 0;
  }
  const currentEntry = deck.playlist[deck.currentIndex];

  let presentation = await getActivePresentation();
  if (!presentation) presentation = await createPresentation("Broadcast Mixer");
  await saveDraft(presentation.id, {
    title: "Broadcast Mixer",
    description: `Fed by the ${deckId === "left" ? "Left" : "Right"} Deck`,
    queue: await deckPlaylistToQueue(deck, mixer.autoAdvanceSeconds),
  });
  await publishPresentation(presentation.id);
  await movePlayhead({ op: "jump", itemId: currentEntry.entryId }, "cockpit");
  await movePlayhead({ op: "play" }, "cockpit");

  const state = await loadPresentationState();
  state.manualTakeActive = true;
  state.autoFollowVdj = false;
  await savePresentationState(state);

  mixer.liveDeckId = deckId;
  await saveMixerState(mixer);

  return { mixer, status: await getBroadcastStatus({ forcePublicCheck: true }) };
}

/** Pause a deck. Only has a real effect when this deck is the live one. */
export async function pauseDeck(deckId: DeckId): Promise<{ mixer: MixerState; status: BroadcastStatus }> {
  assertLocalStudio();
  const mixer = await loadMixerState();
  if (mixer.liveDeckId === deckId) {
    await movePlayhead({ op: "pause" }, "cockpit");
  }
  return { mixer, status: await getBroadcastStatus({ forcePublicCheck: true }) };
}

/** Prev/Next on a deck. Drives the real playhead when this deck is live;
 * otherwise just moves the local cue position. */
export async function stepDeck(
  deckId: DeckId,
  direction: "next" | "previous",
): Promise<{ mixer: MixerState; status: BroadcastStatus }> {
  assertLocalStudio();
  const mixer = await loadMixerState();
  const deck = deckOf(mixer, deckId);

  if (mixer.liveDeckId === deckId) {
    await movePlayhead({ op: direction }, "cockpit");
    const status = await getBroadcastStatus({ forcePublicCheck: true });
    const activeEntryId = status.local.item?.id ?? null;
    const activeIndex = deck.playlist.findIndex((entry) => entry.entryId === activeEntryId);
    if (activeIndex !== -1) deck.currentIndex = activeIndex;
    await saveMixerState(mixer);
    return { mixer, status };
  }

  if (deck.playlist.length > 0) {
    const delta = direction === "next" ? 1 : -1;
    deck.currentIndex = (deck.currentIndex + delta + deck.playlist.length) % deck.playlist.length;
    await saveMixerState(mixer);
  }
  return { mixer, status: await getBroadcastStatus() };
}

export async function setDeckTransportOptions(
  deckId: DeckId,
  options: { autoReturnToLive?: boolean },
): Promise<MixerState> {
  assertLocalStudio();
  const mixer = await loadMixerState();
  const deck = deckOf(mixer, deckId);
  if (options.autoReturnToLive !== undefined) deck.autoReturnToLive = options.autoReturnToLive;
  await saveMixerState(mixer);
  if (mixer.liveDeckId === deckId) {
    await republishIfLive(mixer, deckId);
  }
  return mixer;
}

export async function setDeckPlaybackMode(
  deckId: DeckId,
  playbackMode: PlaybackMode,
): Promise<MixerState> {
  assertLocalStudio();
  const mixer = await loadMixerState();
  deckOf(mixer, deckId).playbackMode = playbackMode;
  await saveMixerState(mixer);
  if (mixer.liveDeckId === deckId) {
    await republishIfLive(mixer, deckId);
  }
  return mixer;
}

export async function setMixerAutoAdvanceSeconds(seconds: number): Promise<MixerState> {
  assertLocalStudio();
  const mixer = await loadMixerState();
  const { normalizeAutoAdvanceSeconds } = await import("@/lib/bobos/mixer/playback-defaults");
  mixer.autoAdvanceSeconds = normalizeAutoAdvanceSeconds(seconds);
  await saveMixerState(mixer);
  if (mixer.liveDeckId) {
    await republishIfLive(mixer, mixer.liveDeckId);
  }
  return mixer;
}

/** Load a Broadcast Sequence's slides onto a deck playlist (replaces existing rows).
 * Generic — works for any imported collection's sequence, not just Live Aid. */
export async function loadSequenceToDeck(
  deckId: DeckId,
  collectionId: string,
  sequenceId: string,
): Promise<MixerState> {
  assertLocalStudio();
  const entries = await sequenceToDeckEntries(collectionId, sequenceId);
  if (entries.length === 0) {
    throw new Error(`Unknown sequence: ${collectionId}/${sequenceId}`);
  }
  const mixer = await loadMixerState();
  const deck = deckOf(mixer, deckId);
  deck.playlist = entries;
  deck.currentIndex = 0;
  applyCollectionPlaybackMode(deck, collectionId);
  await saveMixerState(mixer);
  await republishIfLive(mixer, deckId);
  return mixer;
}

/** Collection sidebar items for the Asset Browser. */
export async function listMixerCollection(collectionId: string): Promise<MixerCollectionItem[]> {
  assertLocalStudio();
  if (collectionId === "recent") {
    const mixer = await loadMixerState();
    const seen = new Set<string>();
    const recent: MixerCollectionItem[] = [];
    for (const deckId of ["left", "right"] as const) {
      for (const entry of mixer[deckId].playlist) {
        const key = `${entry.kind}:${entry.assetId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        recent.push({
          assetId: entry.assetId,
          kind: entry.kind,
          title: entry.title,
          subtitle: entry.subtitle,
          coverUrl: entry.coverUrl,
          loadKey: entry.assetId,
          loadKind: "asset",
        });
      }
    }
    return recent.slice(0, 24);
  }
  if (collectionId === "favorites") return [];
  return listMixerCollectionItems(collectionId);
}

/** Collections shown in the Asset Browser sidebar — imported first, then
 * built-in ids that have no imported data yet. */
export async function listMixerCollectionsAction(): Promise<{ id: string; title: string; imported: boolean }[]> {
  assertLocalStudio();
  return listMixerCollections();
}

/** Double-click / Open from a collection row — sequence loads its slides; asset appends. */
export async function openMixerCollectionItem(
  deckId: DeckId,
  item: MixerCollectionItem,
  sourceCollectionId?: string | null,
): Promise<MixerState> {
  assertLocalStudio();
  const collectionId = item.collectionId ?? sourceCollectionId ?? null;
  if (item.loadKind === "sequence" && item.loadKey && item.collectionId) {
    return loadSequenceToDeck(deckId, item.collectionId, item.loadKey);
  }

  if (item.kind === "vdj-live" || item.loadKey === "vdj-live") {
    const live = await getVdjLiveAsset();
    if (!live) throw new Error("VirtualDJ live track not available.");
    await addAssetToDeck(deckId, live);
  } else {
    await addAssetToDeck(deckId, item);
  }

  if (!collectionId) return loadMixerState();

  const mixer = await loadMixerState();
  applyCollectionPlaybackMode(deckOf(mixer, deckId), collectionId);
  await saveMixerState(mixer);
  await republishIfLive(mixer, deckId);
  return mixer;
}

/** When a live deck finishes its playlist, optionally return to VirtualDJ follow. */
export async function maybeAutoReturnDeckToLive(): Promise<BroadcastStatus | null> {
  assertLocalStudio();
  const mixer = await loadMixerState();
  if (!mixer.liveDeckId) return null;
  const deck = deckOf(mixer, mixer.liveDeckId);
  if (deck.playbackMode === "loop" || !deck.autoReturnToLive || deck.playlist.length === 0) return null;

  const status = await getBroadcastStatus();
  const local = status.local;
  if (!local.onAir || local.mode !== "playing") return null;

  const lastEntry = deck.playlist[deck.playlist.length - 1];
  if (local.item?.id !== lastEntry?.entryId) return null;

  const duration = local.broadcast.duration;
  if (duration == null || duration <= 0) return null;
  if (local.elapsedSeconds < duration) return null;

  mixer.liveDeckId = null;
  await saveMixerState(mixer);
  return returnBroadcastToLive();
}

/* ── Asset Browser ── */

export type MixerSearchableKind = Extract<AssetKind, "track" | "album" | "artist" | "year">;

const RE_RVYR = /^RVYR(\d{4})$/i;

/** Canonical entity search (RVTR/RVAL/RVAR/RVYR) backing the Asset Browser.
 * RVWK and RVEV have no canonical data source yet — callers get an empty
 * result for those kinds until a later sprint. Never fabricates: a query
 * that matches nothing real returns an empty array, not placeholder rows. */
export async function searchMixerAssets(
  query: string,
  kinds?: MixerSearchableKind[],
): Promise<AssetReference[]> {
  assertLocalStudio();
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Exact canonical-ID typed verbatim (e.g. "RVTR215144") — text search below
  // matches titles/artists, not IDs, so this is a separate direct lookup.
  const { resolveAssetByRvId } = await import("@/lib/bobos/mixer/resolve-asset-by-id");
  const byId = await resolveAssetByRvId(trimmed);
  if (byId) return !kinds || kinds.includes(byId.kind as MixerSearchableKind) ? [byId] : [];

  const yearQuery = trimmed.match(RE_RVYR)?.[1] ?? trimmed;

  const { querySearchEntities } = await import("@/lib/search/query-search-entities");
  const { entities } = await querySearchEntities(yearQuery, { mode: "full" });

  return entities
    .filter((entity): entity is typeof entity & { entityType: MixerSearchableKind } => {
      const kind = entity.entityType as MixerSearchableKind;
      return (!kinds || kinds.includes(kind)) && ["track", "album", "artist", "year"].includes(kind);
    })
    .map((entity) => ({
      assetId: formatAssetId(entity.entityType, entity.rvId ?? entity.slug ?? entity.label),
      kind: entity.entityType,
      title: entity.label,
      subtitle: entity.artist ?? (entity.year ? String(entity.year) : ""),
      coverUrl: entity.coverUrl,
    }));
}

/** The fixed Broadcast (RVBA) asset template library — slides, announcements,
 * countdowns, etc. Not searched; always the same short list. */
export async function listRvbaTemplates(): Promise<AssetReference[]> {
  assertLocalStudio();
  return RVBA_TEMPLATES;
}

/** VirtualDJ Live represented as a pinned Asset Browser card, sourced from
 * the existing Sunday Nights live-track state — no new VDJ plumbing. */
export async function getVdjLiveAsset(): Promise<AssetReference | null> {
  assertLocalStudio();
  const { loadSundayNightsState } = await import("@/lib/sunday-nights/state");
  const sn = await loadSundayNightsState();
  const live = sn.live;
  if (!live?.title?.trim() || !live?.artist?.trim()) return null;

  return {
    assetId: live.rvtr ? formatAssetId("track", live.rvtr) : "VDJ-LIVE",
    kind: "vdj-live",
    title: live.title.trim(),
    subtitle: live.artist.trim(),
    coverUrl: live.coverUrl ?? null,
  };
}

/* ── Sequence queueing ── */

export type QueueSequenceOptions = {
  collectionId: string;
  sequenceId: string;
  loop: boolean;
};

/**
 * Queue a Broadcast Sequence into the on-air presentation, independent of
 * the Mixer decks. Each slide becomes one queue item; the existing playhead
 * engine handles advance + loop. Generic — any imported collection.
 */
export async function queueSequence(options: QueueSequenceOptions): Promise<BroadcastStatus> {
  assertLocalStudio();

  const manifest = await getCollectionManifest(options.collectionId);
  const sequence = manifest?.sequences.find((s) => s.id === options.sequenceId);
  if (!manifest || !sequence) {
    throw new Error(`Unknown sequence: ${options.collectionId}/${options.sequenceId}`);
  }

  const presentations = await listPresentations();
  let presentation = presentations.find((p) => p.title === manifest.title) ?? null;
  if (!presentation) {
    presentation = await createPresentation(manifest.title);
  }

  const entries = await sequenceToDeckEntries(options.collectionId, options.sequenceId);
  const playbackMode = defaultPlaybackModeForCollection(options.collectionId);
  const mixer = await loadMixerState();
  const queue = await deckPlaylistToQueue(
    { playlist: entries, playbackMode },
    mixer.autoAdvanceSeconds,
  );
  await saveDraft(presentation.id, {
    title: presentation.title,
    description: `${sequence.title} (slides ${sequence.startSlide}–${sequence.endSlide})`,
    queue,
  });

  const published = await publishPresentation(presentation.id);
  if (!published?.published) {
    throw new Error(`Failed to publish sequence ${sequence.id}.`);
  }

  const state = await loadPresentationState();
  const firstEnabled = enabledItems(queue)[0] ?? null;
  const now = new Date().toISOString();
  state.activePresentationId = presentation.id;
  state.manualTakeActive = true;
  state.autoFollowVdj = false;
  state.playhead = {
    presentationId: presentation.id,
    anchorItemId: firstEnabled?.id ?? null,
    anchorStartedAt: now,
    mode: firstEnabled ? "playing" : "paused",
    movedBy: "cockpit",
    updatedAt: now,
  };
  await savePresentationState(state);
  await syncBroadcast();

  return getBroadcastStatus({ forcePublicCheck: true });
}

/** Return audience view to VirtualDJ auto-follow after a manual segment. */
export async function returnBroadcastToLive(): Promise<BroadcastStatus> {
  assertLocalStudio();
  const { setAutoFollowVdj } = await import("@/lib/bobos/presentation/vdj-takeover");
  await setAutoFollowVdj(true);
  return getBroadcastStatus({ forcePublicCheck: true });
}

/* ── Broadcast Collection Importer ── */

export type ImportBroadcastCollectionResult = {
  id: string;
  title: string;
  slideCount: number;
  sequenceCount: number;
};

/**
 * Import a Broadcast Collection from a ZIP uploaded via the Asset Browser's
 * "Import Collection" control. Same pipeline the CLI uses — no Live-Aid-
 * specific code here. Only ZIP is accepted from the browser today; folder
 * import is CLI-only (a folder can't be selected as a single upload).
 */
export async function importBroadcastCollectionAction(
  formData: FormData,
): Promise<ImportBroadcastCollectionResult> {
  assertLocalStudio();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Collection title is required.");

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Choose a ZIP file to import.");
  if (!file.name.toLowerCase().endsWith(".zip")) {
    throw new Error("Only .zip files are supported from the browser right now.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const manifest = await importBroadcastCollection({
    sourceKind: "zip",
    input: { buffer },
    collectionTitle: title,
  });

  return {
    id: manifest.id,
    title: manifest.title,
    slideCount: manifest.slides.length,
    sequenceCount: manifest.sequences.length,
  };
}

/** Full manifest for the inline sequence editor (title/start/end/duration/loop/tags). */
export async function getBroadcastCollectionManifestAction(
  collectionId: string,
): Promise<BroadcastCollectionManifest | null> {
  assertLocalStudio();
  return getCollectionManifest(collectionId, { fresh: true });
}

/** Save operator corrections to a collection's auto-detected sequences. */
export async function updateCollectionSequencesAction(
  collectionId: string,
  sequences: BroadcastSequence[],
): Promise<void> {
  assertLocalStudio();
  await updateCollectionSequences(collectionId, sequences);
}
