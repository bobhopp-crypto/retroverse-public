/**
 * Presentation engine — first-class objects.
 *
 * Presentation → Presentation Queue → Playhead → Retroverse Live → Audience.
 *
 * This is the permanent presentation layer for Live Aid, Woodstock,
 * Sunday Night Series, Artist Spotlights, Year Shows, and future
 * Retroverse experiences. Keep it event-agnostic: no show-specific types.
 *
 * This module is intentionally isomorphic (no server-only imports) so the
 * playhead resolver and item renderer can run in the Studio preview, the
 * public player, and the API with identical results.
 */

/* ── Presentation Item ── */

export const PRESENTATION_ITEM_TYPES = [
  "slide",
  "artist",
  "song",
  "announcement",
  "registration",
  "countdown",
  "coming-soon",
  "current-event",
  "placeholder",
] as const;

export type PresentationItemType = (typeof PRESENTATION_ITEM_TYPES)[number];

export const PRESENTATION_ITEM_TYPE_LABELS: Record<PresentationItemType, string> = {
  slide: "Slide",
  artist: "Artist",
  song: "Song",
  announcement: "Announcement",
  registration: "Registration",
  countdown: "Countdown",
  "coming-soon": "Coming Soon",
  "current-event": "Current Event",
  placeholder: "Placeholder",
};

export const PRESENTATION_TRANSITIONS = ["cut", "fade", "slide"] as const;

export type PresentationTransition = (typeof PRESENTATION_TRANSITIONS)[number];

export const PRESENTATION_TRANSITION_LABELS: Record<PresentationTransition, string> = {
  cut: "Cut",
  fade: "Fade",
  slide: "Slide",
};

/** Triggers are stored in v1; only "automatic" (duration elapse) is executed. */
export const PRESENTATION_TRIGGERS = [
  "automatic",
  "manual",
  "song-change",
  "artist-change",
  "event-change",
  "manual-override",
] as const;

export type PresentationTrigger = (typeof PRESENTATION_TRIGGERS)[number];

export const PRESENTATION_TRIGGER_LABELS: Record<PresentationTrigger, string> = {
  automatic: "Automatic",
  manual: "Manual",
  "song-change": "Song Change",
  "artist-change": "Artist Change",
  "event-change": "Event Change",
  "manual-override": "Manual Override",
};

/** Optional linked canonical object (RVAR artist, RVTR song, future experience). */
export type PresentationItemLink = {
  kind: "artist" | "song" | "experience";
  /** Canonical ID — RVAR / RVTR / experience slug. */
  id: string;
  /** Display label so the queue and stage never need a lookup to render. */
  label: string;
};

export type PresentationItem = {
  id: string;
  type: PresentationItemType;
  title: string;
  subtitle: string;
  /** Longer copy — announcement body, slide text. */
  body: string;
  enabled: boolean;
  /** Seconds on screen. 0 = hold until moved manually. */
  durationSeconds: number;
  transition: PresentationTransition;
  trigger: PresentationTrigger;
  link: PresentationItemLink | null;
  /** Countdown items — ISO datetime the countdown targets. */
  countdownTarget: string | null;
  /** Operator notes — never rendered to the audience. */
  notes: string;
};

/* ── Presentation Queue ── */

export type PresentationQueue = {
  items: PresentationItem[];
  /** Loop back to the first enabled item after the last. */
  loop: boolean;
};

/* ── Presentation ── */

export type PresentationPublishedSnapshot = {
  title: string;
  queue: PresentationQueue;
  publishedAt: string;
};

export type Presentation = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  /** Draft queue — what the Studio edits. */
  queue: PresentationQueue;
  /** Frozen copy served to the audience. Null until first publish. */
  published: PresentationPublishedSnapshot | null;
};

/* ── Playhead ── */

export type PlayheadMode = "playing" | "paused";

export type PlayheadMover = "auto" | "manual" | "cockpit" | "vdj" | "system";

/**
 * The Playhead is an anchor, not a cursor: it records which item started
 * playing and when. The current item is *derived* by walking enabled-item
 * durations forward from the anchor — so auto-advance needs no timers or
 * background jobs, and every reader (Studio, API, player) agrees.
 */
export type Playhead = {
  presentationId: string | null;
  /** Item that was current when the playhead was last explicitly moved. */
  anchorItemId: string | null;
  /** ISO timestamp the anchor item started. */
  anchorStartedAt: string;
  mode: PlayheadMode;
  movedBy: PlayheadMover;
  updatedAt: string;
};

/* ── Presentation State ── */

/** Global engine state: which presentation is on air, and its playhead. */
export type PresentationState = {
  version: 1;
  /** Presentation whose published snapshot Retroverse Live plays. */
  activePresentationId: string | null;
  playhead: Playhead;
  /** Default ON — VirtualDJ pauses broadcast and phones follow live songs. */
  autoFollowVdj: boolean;
  /** Broadcast paused because VirtualDJ is live. */
  vdjTakeoverActive: boolean;
  /** When VirtualDJ playback last stopped (idle timeout anchor). */
  vdjStoppedAt: string | null;
  /** Metadata about the last broadcast source refresh (if any). */
  broadcastSourceMeta?: {
    id: string;
    itemCount: number;
    generatedAt: string;
    songDurationSeconds: number;
  } | null;
};

/* ── Defaults ── */

export const DEFAULT_ITEM_DURATION_SECONDS = 20;

/** New queue item with sensible defaults. Runs in Studio client and server. */
export function newPresentationItem(type: PresentationItemType): PresentationItem {
  return {
    id: crypto.randomUUID(),
    type,
    title: PRESENTATION_ITEM_TYPE_LABELS[type],
    subtitle: "",
    body: "",
    enabled: true,
    durationSeconds: DEFAULT_ITEM_DURATION_SECONDS,
    transition: "fade",
    trigger: "automatic",
    link: null,
    countdownTarget: null,
    notes: "",
  };
}

export function defaultPlayhead(): Playhead {
  const now = new Date().toISOString();
  return {
    presentationId: null,
    anchorItemId: null,
    anchorStartedAt: now,
    mode: "paused",
    movedBy: "system",
    updatedAt: now,
  };
}

export function defaultPresentationState(): PresentationState {
  return {
    version: 1,
    activePresentationId: null,
    playhead: defaultPlayhead(),
    autoFollowVdj: true,
    vdjTakeoverActive: false,
    vdjStoppedAt: null,
  };
}

/** Transport commands the Studio, Cockpit, and (future) VirtualDJ can send. */
export type PlayheadCommand =
  | { op: "play" }
  | { op: "pause" }
  | { op: "next" }
  | { op: "previous" }
  | { op: "jump"; itemId: string };

/** Public payload for "What is the current Playhead?" — all the player gets. */
export type PlayheadPayload = {
  onAir: boolean;
  presentation: { id: string; title: string } | null;
  /** Resolved current item from the published snapshot. */
  item: PresentationItem | null;
  itemIndex: number;
  itemCount: number;
  mode: PlayheadMode;
  /** Seconds the current item has been on screen (0 when paused/held). */
  elapsedSeconds: number;
  /** Enabled item after the current one (respecting loop). Null at the end. */
  nextItem: PresentationItem | null;
  /** Full published queue — lets controllers render the queue from one call. */
  queue: PresentationQueue | null;
  /** When the on-air presentation was last published. */
  publishedAt: string | null;
  updatedAt: string;
  /** When true, VirtualDJ playback pauses broadcast and phones follow live songs. */
  autoFollowVdj: boolean;
  /** VirtualDJ auto-takeover — derived from bridge + presentation state. */
  vdj: PlayheadVdjState;
};

export type PlayheadVdjState = {
  /** Bridge reports audible deck / playback active. */
  playing: boolean;
  rvtr: string | null;
  /** Broadcast rotation paused for live song mode. */
  takeoverActive: boolean;
  /** ISO time broadcast resumes after idle timeout (stoppedAt + 15s). */
  resumeBroadcastAt: string | null;
};

/**
 * Broadcast Snapshot — the published queue and its playhead in one document.
 *
 * This is the unit of sync between the local studio and the deployed site:
 * every operator action pushes a fresh snapshot, and because the playhead is
 * an anchor (item + start time), both sites derive the current item
 * identically with no further syncing.
 */
export type BroadcastSnapshot = {
  version: 1;
  presentationId: string;
  title: string;
  queue: PresentationQueue;
  playhead: Playhead;
  publishedAt: string;
  updatedAt: string;
  autoFollowVdj: boolean;
};
