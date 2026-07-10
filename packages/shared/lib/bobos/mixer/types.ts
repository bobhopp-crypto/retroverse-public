/**
 * Broadcast Mixer — first-class objects.
 *
 * Broadcast Mixer -> Deck Playlist -> Asset Reference -> Playback Engine.
 *
 * The Mixer owns two decks and their playlists of canonical Asset
 * References. It knows nothing about PresentationItem, Playhead, or any
 * other detail of the underlying playback engine — that translation lives
 * entirely in `playback-adapter.ts`. This file (and the rest of the Mixer
 * layer) must stay that way so future outputs can reuse the same deck
 * model without dragging engine internals through the UI.
 */

export const DECK_IDS = ["left", "right"] as const;
export type DeckId = (typeof DECK_IDS)[number];

export const PLAYBACK_MODES = ["auto", "manual", "loop"] as const;
export type PlaybackMode = (typeof PLAYBACK_MODES)[number];

export const PLAYBACK_MODE_LABELS: Record<PlaybackMode, string> = {
  auto: "Auto",
  manual: "Manual",
  loop: "Loop",
};

/** v1 ships one real output (Website). Terminal is a stub for a future sprint. */
export const MIXER_OUTPUTS = ["website", "terminal"] as const;
export type MixerOutputId = (typeof MIXER_OUTPUTS)[number];

export const MIXER_OUTPUT_LABELS: Record<MixerOutputId, string> = {
  website: "Website (retroverse.live)",
  terminal: "Terminal",
};

/** Canonical asset kinds a deck can reference. */
export const ASSET_KINDS = [
  "track",
  "album",
  "artist",
  "week",
  "year",
  "event",
  "broadcast",
  "vdj-live",
] as const;

export type AssetKind = (typeof ASSET_KINDS)[number];

export const ASSET_KIND_LABELS: Record<AssetKind, string> = {
  track: "Song",
  album: "Album",
  artist: "Artist",
  week: "Week",
  year: "Year",
  event: "Event",
  broadcast: "Broadcast",
  "vdj-live": "VirtualDJ Live",
};

/** ID prefix per the canonical asset system (RVBA_PUBLIC.md vocabulary). */
export const ASSET_KIND_PREFIX: Record<AssetKind, string> = {
  track: "RVTR",
  album: "RVAL",
  artist: "RVAR",
  week: "RVWK",
  year: "RVYR",
  event: "RVEV",
  broadcast: "RVBA",
  "vdj-live": "VDJ",
};

/** Default seconds an asset stays on a deck's screen when the playlist row
 * doesn't override it. Songs hold for their real duration (0 = handled by
 * the Song Experience itself); everything else gets a sensible slide time. */
export const ASSET_KIND_DEFAULT_DURATION: Record<AssetKind, number> = {
  track: 0,
  album: 20,
  artist: 20,
  week: 20,
  year: 20,
  event: 20,
  broadcast: 20,
  "vdj-live": 0,
};

/**
 * A reference to a canonical (or custom broadcast) asset. The Mixer stores
 * references plus playback settings — never content. `assetId` is the
 * canonical id (RVTR/RVAL/RVAR/RVWK/RVYR/RVEV) or a stable synthetic id for
 * `broadcast` templates and the `vdj-live` pseudo-asset.
 */
export type AssetReference = {
  assetId: string;
  kind: AssetKind;
  title: string;
  subtitle: string;
  coverUrl: string | null;
};

/** One row in a deck playlist — an Asset Reference plus per-entry playback
 * overrides. `entryId` is the row's own identity so the same asset can
 * appear more than once in a playlist. */
export type DeckPlaylistEntry = AssetReference & {
  entryId: string;
  /** Seconds this entry stays up; null = use the asset kind default. */
  durationSeconds: number | null;
  loop: boolean;
};

export type Deck = {
  id: DeckId;
  playlist: DeckPlaylistEntry[];
  /** Index into `playlist` of the entry currently cued/playing on this deck. */
  currentIndex: number;
  /** Output this deck is assigned to feed when played. Null = unassigned. */
  output: MixerOutputId | null;
  /** Operator playback mode — controls auto-advance and queue looping. */
  playbackMode: PlaybackMode;
  /** When the playlist ends in Auto mode, return to VirtualDJ live follow. */
  autoReturnToLive: boolean;
};

export type MixerState = {
  version: 1;
  left: Deck;
  right: Deck;
  /** Seconds each slide stays on screen in Auto and Loop modes. */
  autoAdvanceSeconds: number;
  /** Which deck is currently feeding the real Website output, if any.
   * Hard-cutover model: only one deck can drive a given output at a time. */
  liveDeckId: DeckId | null;
};

export function newDeck(id: DeckId): Deck {
  return {
    id,
    playlist: [],
    currentIndex: 0,
    output: "website",
    playbackMode: "auto",
    autoReturnToLive: true,
  };
}

export function defaultMixerState(): MixerState {
  return {
    version: 1,
    left: newDeck("left"),
    right: newDeck("right"),
    autoAdvanceSeconds: 10,
    liveDeckId: null,
  };
}

export function newDeckPlaylistEntry(asset: AssetReference): DeckPlaylistEntry {
  return {
    ...asset,
    entryId: crypto.randomUUID(),
    durationSeconds: null,
    loop: false,
  };
}

export function formatAssetId(kind: AssetKind, raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return ASSET_KIND_PREFIX[kind];
  const prefix = ASSET_KIND_PREFIX[kind];
  return trimmed.toUpperCase().startsWith(prefix) ? trimmed.toUpperCase() : `${prefix}${trimmed}`;
}
