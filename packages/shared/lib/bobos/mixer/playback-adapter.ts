/**
 * Playback adapter — the only file in the Mixer layer that knows the
 * existing Presentation engine exists.
 *
 * Broadcast Mixer -> Deck Playlist -> Asset Reference -> Playback Engine.
 *
 * Everything above this file (Mixer state, Decks, Asset References, the
 * Mixer UI) is engine-agnostic. This adapter translates a deck's playlist
 * of Asset References into the `PresentationQueue` shape the existing
 * `PresentationState` engine executes, so that engine can remain an
 * implementation detail — a future output can reuse the exact same Deck
 * model and get a different adapter instead of touching the Mixer at all.
 *
 * Imported broadcast slides (any RVBA id produced by `lib/bobos/importer`)
 * resolve generically via `findSlideByRvbaId` — this file never branches on
 * where an asset came from (Gamma, a folder, a sponsor, …), only on whether
 * it resolves to a slide with media.
 */

import "server-only";

import { findSlideByRvbaId, slideMediaUrl } from "@/lib/bobos/importer/lookup";
import {
  newPresentationItem,
  type PresentationItem,
  type PresentationItemType,
  type PresentationQueue,
} from "@/lib/bobos/presentation/types";

import type { AssetKind, Deck, DeckPlaylistEntry, PlaybackMode } from "./types";
import { ASSET_KIND_DEFAULT_DURATION } from "./types";

/** Best-effort mapping to the engine's legacy item type vocabulary. Only
 * `track`/`artist`/`vdj-live` resolve to a deep link today — album/week/
 * year/event/broadcast play as titled cards without deep-link, a known v1
 * stub (see sprint plan) until the engine's link kinds grow to match the
 * full canonical asset system. */
const KIND_TO_ITEM_TYPE: Record<AssetKind, PresentationItemType> = {
  track: "song",
  artist: "artist",
  album: "slide",
  week: "slide",
  year: "slide",
  event: "slide",
  broadcast: "announcement",
  "vdj-live": "song",
};

function durationForPlaybackMode(
  entry: DeckPlaylistEntry,
  playbackMode: PlaybackMode,
  autoAdvanceSeconds: number,
): number {
  if (entry.durationSeconds != null) return Math.max(0, entry.durationSeconds);
  if (playbackMode === "manual") return 0;
  if (entry.kind === "track" || entry.kind === "vdj-live") {
    return ASSET_KIND_DEFAULT_DURATION[entry.kind];
  }
  return autoAdvanceSeconds;
}

/** Translate one deck playlist row into a PresentationItem the engine can
 * run. `entry.entryId` becomes the item id so playhead anchors, jumps, and
 * reordering all key off the same stable identity as the Mixer UI. */
export async function assetReferenceToPresentationItem(
  entry: DeckPlaylistEntry,
  playbackMode: PlaybackMode,
  autoAdvanceSeconds: number,
): Promise<PresentationItem> {
  const durationSeconds = durationForPlaybackMode(entry, playbackMode, autoAdvanceSeconds);

  if (entry.kind === "broadcast" && entry.assetId.startsWith("RVBA-")) {
    const found = await findSlideByRvbaId(entry.assetId);
    if (found) {
      const item = newPresentationItem("slide");
      item.id = entry.entryId;
      item.title = found.slide.title;
      item.subtitle = "";
      item.durationSeconds = durationSeconds;
      item.transition = "fade";
      item.trigger = "automatic";
      item.mediaUrl = slideMediaUrl(found.collectionId, "masters", found.slide.masterFile);
      item.mediaWidth = found.slide.width;
      item.mediaHeight = found.slide.height;
      return item;
    }
  }

  const item = newPresentationItem(KIND_TO_ITEM_TYPE[entry.kind]);
  item.id = entry.entryId;
  item.title = entry.title;
  item.subtitle = entry.subtitle;
  item.durationSeconds = durationSeconds;
  item.enabled = true;

  if (entry.kind === "track" || entry.kind === "vdj-live") {
    item.link = { kind: "song", id: entry.assetId, label: entry.title };
  } else if (entry.kind === "artist") {
    item.link = { kind: "artist", id: entry.assetId, label: entry.title };
  } else {
    item.link = null;
  }

  return item;
}

/** Translate a whole deck playlist into the queue the engine publishes. */
export async function deckPlaylistToQueue(
  deck: Pick<Deck, "playlist" | "playbackMode">,
  autoAdvanceSeconds: number,
): Promise<PresentationQueue> {
  const items = await Promise.all(
    deck.playlist.map((entry) =>
      assetReferenceToPresentationItem(entry, deck.playbackMode, autoAdvanceSeconds),
    ),
  );
  return { items, loop: deck.playbackMode === "loop" };
}
