import {
  DEFAULT_RETROVERSE_STYLE_ID,
  isRetroverseStyleId,
} from "@/lib/retroverse/style-catalog";

import {
  CREDENTIAL_TYPES,
  DEFAULT_FINISHING,
  EVENT_TYPES,
  VENUE_TYPES,
  cloneValue,
  createDefaultPreferences,
  createId,
  orderedCredentialTypes,
  type ArtworkAsset,
  type AuthenticationLayout,
  type ArtworkMap,
  type CredentialDraft,
  type CredentialRecord,
  type CredentialSerialMap,
  type CredentialTypeId,
  type FinishingAdjustments,
  type SessionPreferences,
  type StoredFinishingMap,
  type StoredAuthenticationLayoutMap,
} from "./model";

const PREFERENCES_KEY = "bobos.credentials.v1.preferences";
const LIBRARY_KEY = "bobos.credentials.v1.library";

const credentialTypeValues = new Set<string>(CREDENTIAL_TYPES.map(({ value }) => value));
const eventTypeValues = new Set<string>(EVENT_TYPES.map(({ value }) => value));
const venueTypeValues = new Set<string>(VENUE_TYPES.map(({ value }) => value));

const LEGACY_EVENT_TYPE_MAP: Record<string, SessionPreferences["eventType"]> = {
  concert: "live-music",
  festival: "community-event",
  conference: "other",
  holiday: "holiday-event",
  community: "community-event",
  awards: "other",
  sports: "community-event",
  private: "private-party",
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeFinishing(value: unknown): FinishingAdjustments {
  const raw = isObject(value) ? value : {};
  return {
    exposure: numberValue(raw.exposure, DEFAULT_FINISHING.exposure),
    contrast: numberValue(raw.contrast, DEFAULT_FINISHING.contrast),
    saturation: numberValue(raw.saturation, DEFAULT_FINISHING.saturation),
    temperature: numberValue(raw.temperature, DEFAULT_FINISHING.temperature),
    tint: numberValue(raw.tint, DEFAULT_FINISHING.tint),
    scale: numberValue(raw.scale, DEFAULT_FINISHING.scale),
    x: numberValue(raw.x, DEFAULT_FINISHING.x),
    y: numberValue(raw.y, DEFAULT_FINISHING.y),
    brightness: numberValue(raw.brightness, DEFAULT_FINISHING.brightness),
    hue: numberValue(raw.hue, DEFAULT_FINISHING.hue),
    vibrance: numberValue(raw.vibrance, DEFAULT_FINISHING.vibrance),
    sharpen: numberValue(raw.sharpen, DEFAULT_FINISHING.sharpen),
    grain: numberValue(raw.grain, DEFAULT_FINISHING.grain),
    fade: numberValue(raw.fade, DEFAULT_FINISHING.fade),
  };
}

function normalizeCredentialTypes(value: unknown): CredentialTypeId[] {
  if (!Array.isArray(value)) return ["event"];
  return orderedCredentialTypes(
    value.filter((item): item is CredentialTypeId => typeof item === "string" && credentialTypeValues.has(item)),
  );
}

function normalizeAsset(value: unknown): ArtworkAsset | null {
  if (!isObject(value)) return null;
  const source = stringValue(value.source);
  const id = stringValue(value.id);
  if (!source || !id) return null;
  return {
    id,
    source,
    contextKey: stringValue(value.contextKey),
    generatedAt: stringValue(value.generatedAt, new Date(0).toISOString()),
    renderMode: value.renderMode === "complete" ? "complete" : "background",
  };
}

function normalizeEventType(value: unknown): SessionPreferences["eventType"] {
  const raw = stringValue(value);
  if (eventTypeValues.has(raw)) return raw as SessionPreferences["eventType"];
  return LEGACY_EVENT_TYPE_MAP[raw] ?? "dj-night";
}

function normalizeSerials(value: unknown, types: CredentialTypeId[]): CredentialSerialMap {
  if (!isObject(value)) return {};
  const serials: CredentialSerialMap = {};
  for (const type of types) {
    const serial = stringValue(value[type]).trim().toUpperCase();
    if (/^RVSN\d{3,8}$/.test(serial)) serials[type] = serial;
  }
  return serials;
}

function normalizeArtwork(value: unknown, types: CredentialTypeId[]): ArtworkMap {
  if (!isObject(value)) return {};
  const artwork: ArtworkMap = {};
  for (const type of types) {
    const pair = value[type];
    if (!isObject(pair)) continue;
    const front = normalizeAsset(pair.front);
    const back = normalizeAsset(pair.back);
    if (front && back) artwork[type] = { front, back };
  }
  return artwork;
}

function normalizeStoredFinishing(value: unknown, types: CredentialTypeId[]): StoredFinishingMap {
  if (!isObject(value)) return {};
  const finishing: StoredFinishingMap = {};
  for (const type of types) {
    const pair = value[type];
    if (!isObject(pair)) continue;
    finishing[type] = {
      front: normalizeFinishing(pair.front),
      back: normalizeFinishing(pair.back),
    };
  }
  return finishing;
}

function normalizeAuthenticationLayout(value: unknown): AuthenticationLayout | null {
  if (!isObject(value)) return null;
  return {
    qrSize: Math.min(44, Math.max(18, numberValue(value.qrSize, 32))),
    qrX: numberValue(value.qrX, 50),
    qrY: numberValue(value.qrY, 47),
    serialX: numberValue(value.serialX, 50),
    serialY: numberValue(value.serialY, 88),
    serialScale: Math.min(140, Math.max(70, numberValue(value.serialScale, 100))),
    safe: value.safe === true,
    reserved: value.reserved !== false,
  };
}

function normalizeAuthenticationLayouts(
  value: unknown,
  types: CredentialTypeId[],
): StoredAuthenticationLayoutMap | undefined {
  if (!isObject(value)) return undefined;
  const layouts: StoredAuthenticationLayoutMap = {};
  for (const type of types) {
    const layout = normalizeAuthenticationLayout(value[type]);
    if (layout) layouts[type] = layout;
  }
  return Object.keys(layouts).length > 0 ? layouts : undefined;
}

export function loadPreferences(): SessionPreferences {
  const defaults = createDefaultPreferences();
  if (typeof window === "undefined") return defaults;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? "null") as unknown;
    if (!isObject(parsed)) return defaults;
    const rawTypes = normalizeCredentialTypes(parsed.credentialTypes);
    const venueType = stringValue(parsed.venueType);
    const retroverseStyle = stringValue(parsed.retroverseStyle, defaults.retroverseStyle);
    return {
      eventName: stringValue(parsed.eventName),
      venue: stringValue(parsed.venue),
      date: stringValue(parsed.date, defaults.date),
      optionalText: stringValue(parsed.optionalText),
      credentialTypes: rawTypes,
      eventType: normalizeEventType(parsed.eventType),
      venueType: venueTypeValues.has(venueType) ? (venueType as SessionPreferences["venueType"]) : "",
      retroverseStyle: isRetroverseStyleId(retroverseStyle) ? retroverseStyle : defaults.retroverseStyle,
      lastFinishing: normalizeFinishing(parsed.lastFinishing),
    };
  } catch {
    return defaults;
  }
}

export function savePreferences(preferences: SessionPreferences): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
}

function normalizeRecord(value: unknown): CredentialRecord | null {
  if (!isObject(value)) return null;
  const id = stringValue(value.id);
  const eventName = stringValue(value.eventName);
  const venue = stringValue(value.venue);
  const date = stringValue(value.date);
  const eventType = normalizeEventType(value.eventType);
  const venueType = stringValue(value.venueType);
  const retroverseStyle = stringValue(value.retroverseStyle, DEFAULT_RETROVERSE_STYLE_ID);
  if (!id || !eventName || !venue || !date || !eventType || !venueTypeValues.has(venueType)) {
    return null;
  }
  const credentialTypes = normalizeCredentialTypes(value.credentialTypes);
  return {
    id,
    eventName,
    venue,
    date,
    optionalText: stringValue(value.optionalText),
    credentialTypes,
    eventType,
    venueType: venueType as CredentialRecord["venueType"],
    retroverseStyle: isRetroverseStyleId(retroverseStyle) ? retroverseStyle : DEFAULT_RETROVERSE_STYLE_ID,
    artwork: normalizeArtwork(value.artwork, credentialTypes),
    finishing: normalizeStoredFinishing(value.finishing, credentialTypes),
    serials: normalizeSerials(value.serials, credentialTypes),
    authenticationLayouts: normalizeAuthenticationLayouts(value.authenticationLayouts, credentialTypes),
    createdDate: stringValue(value.createdDate, new Date(0).toISOString()),
    modifiedDate: stringValue(value.modifiedDate, new Date(0).toISOString()),
  };
}

export function sortLibrary(records: readonly CredentialRecord[]): CredentialRecord[] {
  return [...records].sort((a, b) => {
    const modified = Date.parse(b.modifiedDate) - Date.parse(a.modifiedDate);
    if (modified !== 0) return modified;
    return Date.parse(b.createdDate) - Date.parse(a.createdDate);
  });
}

export function loadLibrary(): CredentialRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LIBRARY_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return sortLibrary(parsed.map(normalizeRecord).filter((record): record is CredentialRecord => record !== null));
  } catch {
    return [];
  }
}

export function saveLibrary(records: readonly CredentialRecord[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(sortLibrary(records)));
}

export function recordFromDraft(draft: CredentialDraft, now = new Date()): CredentialRecord {
  const timestamp = now.toISOString();
  const artwork: ArtworkMap = {};
  const finishing: StoredFinishingMap = {};
  const serials: CredentialSerialMap = {};
  for (const type of draft.credentialTypes) {
    const pair = draft.artwork[type];
    if (pair) artwork[type] = cloneValue(pair);
    finishing[type] = cloneValue(draft.finishing[type]);
    if (draft.serials[type]) serials[type] = draft.serials[type];
  }
  return {
    id: draft.id ?? createId(),
    eventName: draft.eventName.trim(),
    venue: draft.venue.trim(),
    date: draft.date,
    optionalText: draft.optionalText.trim(),
    credentialTypes: orderedCredentialTypes(draft.credentialTypes),
    eventType: draft.eventType,
    venueType: draft.venueType,
    retroverseStyle: draft.retroverseStyle,
    artwork,
    finishing,
    serials,
    createdDate: draft.createdDate ?? timestamp,
    modifiedDate: timestamp,
  };
}

export function upsertLibrary(records: readonly CredentialRecord[], record: CredentialRecord): CredentialRecord[] {
  return sortLibrary([record, ...records.filter((item) => item.id !== record.id)]);
}

export function removeFromLibrary(records: readonly CredentialRecord[], id: string): CredentialRecord[] {
  return records.filter((record) => record.id !== id);
}

export const credentialsStorageKeys = {
  preferences: PREFERENCES_KEY,
  library: LIBRARY_KEY,
} as const;
