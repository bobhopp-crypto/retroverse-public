import { resolvePlayhead } from "../bobos/presentation/resolve-playhead";
import type { Playhead, PresentationItem, PresentationQueue } from "../bobos/presentation/types";
import { LIVE_BRIDGE_FRESHNESS_MS } from "../sunday-nights/live-freshness";
import { normalizePublicNotes, normalizeVdjYear } from "../sunday-nights/public-notes";
import type { SundayNightsState } from "../sunday-nights/types";
import { publicLiveIdentity } from "./public-live-identity";
import { identitySnapshotReaders } from "./public-identity-snapshots";
import type { PublicHomepagePayload } from "./public-current-song";

type Readers = { [K in keyof typeof identitySnapshotReaders]: () => Promise<unknown> };
type IdentityStatus = "fresh" | "stopped" | "stale" | "unknown" | "selected-experience";
type PublicIdentity = NonNullable<ReturnType<typeof publicLiveIdentity>>;
type BridgeStatus = {
  source: "bridge";
  playing: boolean;
  rvtr: null;
  title: "";
  artist: "";
  year: null;
  bridgeTimestamp: string | null;
  bridgeStoppedAt?: string | null;
};

export type PublicCurrentIdentityPayload = Omit<PublicHomepagePayload, "live" | "updatedAt"> & {
  identityOnly: true;
  identityStatus: IdentityStatus;
  live: PublicIdentity | BridgeStatus | null;
  updatedAt: string | null;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function timestamp(value: unknown): string | null {
  return typeof value === "string" && value.length <= 80 && Number.isFinite(Date.parse(value))
    ? value : null;
}

function identityText(value: unknown): string | null {
  return typeof value === "string" && value.trim() && value.length <= 240 &&
    !/[\u0000-\u001f\u007f<>]/.test(value) && !/(?:\/Users\/|\/home\/|https?:\/\/)/i.test(value)
    ? value.trim() : null;
}

type ProgramKind = "song" | "non-song" | "none" | "unknown";

/** Resolve only duration/anchor metadata. Never dereference catalog or media. */
function programKind(queueValue: unknown, playheadValue: unknown, now: number): ProgramKind {
  const queue = record(queueValue), playhead = record(playheadValue);
  if (!queue || !Array.isArray(queue.items) || queue.items.length > 10_000) return "unknown";
  if (!queue.items.length) return "none";
  const items: PresentationItem[] = [];
  for (const value of queue.items) {
    const item = record(value);
    if (!item || typeof item.id !== "string" || typeof item.enabled !== "boolean" ||
        typeof item.durationSeconds !== "number" || !Number.isFinite(item.durationSeconds) || item.durationSeconds < 0 ||
        typeof item.type !== "string") return "unknown";
    // Only the type and presence of media matter; never return private fields.
    items.push({ id: item.id, type: item.type, enabled: item.enabled,
      durationSeconds: item.durationSeconds, mediaUrl: item.mediaUrl ? "present" : null } as PresentationItem);
  }
  let item: PresentationItem | null = null;
  if (playhead && (playhead.mode === "paused" || playhead.mode === "playing")) {
    if (playhead.mode === "playing" && (!timestamp(playhead.anchorStartedAt) || Date.parse(String(playhead.anchorStartedAt)) > now + 120_000)) return "unknown";
    item = resolvePlayhead({ items, loop: queue.loop !== false } as PresentationQueue, playhead as Playhead, new Date(now)).item;
  }
  // The full Program source has a deck-index fallback. An unresolved anchor
  // is insufficient authority to override a possible non-song take here.
  if (!item) return "unknown";
  return item.type === "song" && !item.mediaUrl ? "song" : "non-song";
}

async function selectedProgramKind(readers: Readers, now: number): Promise<ProgramKind> {
  const mixerValue = await readers.mixer();
  const mixer = record(mixerValue), deck = record(mixer?.left);
  if (mixerValue !== null && (!deck || !Array.isArray(deck.playlist))) return "unknown";
  if (deck && Array.isArray(deck.playlist) && deck.playlist.length) {
    const entries = deck.playlist;
    const kinds = new Set(["track", "vdj-live", "artist", "album", "week", "year", "event", "broadcast"]);
    if (entries.length > 10_000 || !["manual", "auto", "loop"].includes(String(deck.playbackMode))) return "unknown";
    const items = [];
    for (const value of entries) {
      const entry = record(value);
      if (!entry || typeof entry.entryId !== "string" || !kinds.has(String(entry.kind))) return "unknown";
      const song = entry.kind === "track" || entry.kind === "vdj-live";
      const duration = entry.durationSeconds ?? (deck.playbackMode === "manual" || song ? 0 : mixer?.autoAdvanceSeconds);
      items.push({ id: entry.entryId, type: song ? "song" : "announcement", enabled: true, durationSeconds: duration });
    }
    const presentation = record(await readers.presentation());
    return programKind({ items, loop: deck.playbackMode === "loop" }, presentation?.playhead, now);
  }
  const snapshotValue = await readers.broadcast();
  if (snapshotValue === null) return "none";
  const snapshot = record(snapshotValue);
  if (!snapshot || typeof snapshot.presentationId !== "string") return "unknown";
  return programKind(snapshot.queue, snapshot.playhead, now);
}

/**
 * Identity requests never enter the selector/source resolver or live-control
 * engine. Normal VDJ playback takes exactly two existing snapshot reads.
 * Program needs only enough additional snapshot metadata to protect non-song
 * takes. All unavailable/ambiguous authority fails closed without enrichment.
 */
export async function loadPublicCurrentSongIdentity(
  readers: Readers = identitySnapshotReaders,
  now = Date.now(),
): Promise<PublicCurrentIdentityPayload> {
  const [selectorValue, stateValue] = await Promise.all([readers.selector(), readers.live()]);
  const selector = record(selectorValue), state = record(stateValue), rawLive = record(state?.live);
  const updatedAt = timestamp(state?.updatedAt);
  const base: PublicCurrentIdentityPayload = {
    identityOnly: true, identityStatus: "unknown", currentTrackId: null, live: null,
    track: null, channel: null, manualOverride: null, publicSong: null,
    destination: { kind: "TRACK", href: null }, updatedAt,
    publicState: { version: 2, source: "virtualdj", servedAt: new Date(now).toISOString() },
  };
  const selectedId = selector?.selectedId;
  if (selectedId === "announcement" || selectedId === "giveaway") {
    return { ...base, identityStatus: "selected-experience", publicState: { ...base.publicState!, source: "experience-selector" } };
  }
  if (selectedId === "program") {
    const kind = await selectedProgramKind(readers, now);
    if (kind === "non-song") return { ...base, identityStatus: "selected-experience", publicState: { ...base.publicState!, source: "experience-selector" } };
    if (kind === "unknown") return base;
  } else if (selectedId !== "virtualdj") return base;

  const bridgeTimestamp = timestamp(rawLive?.bridgeTimestamp);
  const stopTimestamp = timestamp(state?.bridgeStoppedAt);
  if (state?.bridgePlaying === false && stopTimestamp && now - Date.parse(stopTimestamp) >= -120_000 && now - Date.parse(stopTimestamp) <= LIVE_BRIDGE_FRESHNESS_MS) {
    return { ...base, identityStatus: "stopped", live: { source: "bridge", playing: false,
      rvtr: null, title: "", artist: "", year: null, bridgeTimestamp, bridgeStoppedAt: stopTimestamp } };
  }
  if (state?.bridgePlaying !== true || rawLive?.source !== "bridge" || !bridgeTimestamp) return base;
  const age = now - Date.parse(bridgeTimestamp);
  if (age < -120_000) return base;
  if (age > LIVE_BRIDGE_FRESHNESS_MS) return { ...base, identityStatus: "stale", live: {
    source: "bridge", playing: true, rvtr: null, title: "", artist: "", year: null, bridgeTimestamp,
  } };
  const title = identityText(rawLive.title), artist = identityText(rawLive.artist);
  if (!title || !artist) return base;
  const rvtr = typeof rawLive.rvtr === "string" && /^RVTR\d{6}$/i.test(rawLive.rvtr) ? rawLive.rvtr.toUpperCase() : null;
  const live = {
    rvtr, title, artist, source: "bridge" as const, bridgeTimestamp,
    startedAt: timestamp(rawLive.startedAt), year: normalizeVdjYear(rawLive.year),
    ...(Object.hasOwn(rawLive, "vdjYear") ? { vdjYear: normalizeVdjYear(rawLive.vdjYear) } : {}),
    durationSeconds: typeof rawLive.durationSeconds === "number" && Number.isFinite(rawLive.durationSeconds) && rawLive.durationSeconds > 0 ? rawLive.durationSeconds : null,
    publicNotes: normalizePublicNotes(rawLive.publicNotes, { rvtr, title, artist }),
  };
  const normalized: SundayNightsState = { version: 2, currentTrackId: rvtr, live, bridgePlaying: true, updatedAt: updatedAt ?? "" };
  const identity = publicLiveIdentity(normalized, now);
  return { ...base, identityStatus: "fresh", currentTrackId: rvtr, live: identity };
}
