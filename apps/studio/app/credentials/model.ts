import {
  DEFAULT_RETROVERSE_STYLE_ID,
  type RetroverseStyleId,
} from "@/lib/retroverse/style-catalog";

export type CredentialTypeId = "event" | "vip" | "backstage";
export type CredentialFaceId = "front" | "back";

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
};

export const CREDENTIAL_TYPES: readonly SelectOption<CredentialTypeId>[] = [
  { value: "event", label: "Event Pass" },
  { value: "vip", label: "VIP Pass" },
  { value: "backstage", label: "Backstage Pass" },
] as const;

export const EVENT_TYPES = [
  { value: "dj-night", label: "DJ Night" },
  { value: "bingo", label: "Bingo" },
  { value: "karaoke", label: "Karaoke" },
  { value: "trivia", label: "Trivia" },
  { value: "live-music", label: "Live Music" },
  { value: "dance", label: "Dance" },
  { value: "holiday-event", label: "Holiday Event" },
  { value: "fundraiser", label: "Fundraiser" },
  { value: "private-party", label: "Private Party" },
  { value: "community-event", label: "Community Event" },
  { value: "other", label: "Other" },
] as const;

export type EventTypeId = (typeof EVENT_TYPES)[number]["value"];

export const VENUE_TYPES = [
  { value: "community-hall", label: "Community Club / Hall" },
  { value: "civic-hall", label: "Veterans / Civic Hall" },
  { value: "pub", label: "Pub / Bar / Restaurant" },
  { value: "theater", label: "Theater / Music Venue" },
  { value: "ballroom", label: "Ballroom / Banquet Hall" },
  { value: "hotel", label: "Hotel / Convention Center" },
  { value: "outdoor", label: "Outdoor Venue" },
  { value: "school", label: "School / Campus" },
  { value: "religious", label: "Church / Religious Venue" },
  { value: "sports", label: "Sports Venue" },
  { value: "museum", label: "Museum / Gallery" },
  { value: "private", label: "Private Home / Property" },
  { value: "other", label: "Other / use venue name" },
] as const;

export type VenueTypeId = (typeof VENUE_TYPES)[number]["value"];

export type FinishingAdjustments = {
  exposure: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  scale: number;
  x: number;
  y: number;
  brightness: number;
  hue: number;
  vibrance: number;
  sharpen: number;
  grain: number;
  fade: number;
};

export const DEFAULT_FINISHING: FinishingAdjustments = {
  exposure: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  scale: 100,
  x: 0,
  y: 0,
  brightness: 0,
  hue: 0,
  vibrance: 0,
  sharpen: 0,
  grain: 0,
  fade: 0,
};

export type ArtworkAsset = {
  id: string;
  source: string;
  contextKey: string;
  generatedAt: string;
  /** Historical placeholders were backgrounds; restored VNext output is a complete face. */
  renderMode?: "background" | "complete";
};

export type ArtworkPair = Record<CredentialFaceId, ArtworkAsset>;
export type ArtworkMap = Partial<Record<CredentialTypeId, ArtworkPair>>;
export type FinishingMap = Record<CredentialTypeId, Record<CredentialFaceId, FinishingAdjustments>>;
export type StoredFinishingMap = Partial<Record<CredentialTypeId, Record<CredentialFaceId, FinishingAdjustments>>>;

export type CredentialFields = {
  eventName: string;
  venue: string;
  date: string;
  optionalText: string;
  credentialTypes: CredentialTypeId[];
  eventType: EventTypeId | "";
  venueType: VenueTypeId | "";
  retroverseStyle: RetroverseStyleId;
};

export type CredentialSerialMap = Partial<Record<CredentialTypeId, string>>;

export type AuthenticationLayout = {
  qrSize: number;
  qrX: number;
  qrY: number;
  serialX: number;
  serialY: number;
  serialScale: number;
  safe: boolean;
  reserved: boolean;
};

export type StoredAuthenticationLayoutMap = Partial<Record<CredentialTypeId, AuthenticationLayout>>;

export type CredentialRecord = CredentialFields & {
  id: string;
  artwork: ArtworkMap;
  finishing: StoredFinishingMap;
  serials: CredentialSerialMap;
  authenticationLayouts?: StoredAuthenticationLayoutMap;
  createdDate: string;
  modifiedDate: string;
};

export type CredentialDraft = CredentialFields & {
  id: string | null;
  artwork: ArtworkMap;
  finishing: FinishingMap;
  serials: CredentialSerialMap;
  createdDate: string | null;
  modifiedDate: string | null;
};

export type SessionPreferences = CredentialFields & {
  lastFinishing: FinishingAdjustments;
};

export type SelectedFace = {
  type: CredentialTypeId;
  face: CredentialFaceId;
};

export function createId(prefix = "credential"): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}

export function todayInputValue(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function createDefaultPreferences(): SessionPreferences {
  return {
    eventName: "",
    venue: "",
    date: todayInputValue(),
    optionalText: "",
    credentialTypes: ["event"],
    eventType: "dj-night",
    venueType: "",
    retroverseStyle: DEFAULT_RETROVERSE_STYLE_ID,
    lastFinishing: { ...DEFAULT_FINISHING },
  };
}

export function createFinishingMap(seed: FinishingAdjustments = DEFAULT_FINISHING): FinishingMap {
  return Object.fromEntries(
    CREDENTIAL_TYPES.map(({ value }) => [
      value,
      {
        front: { ...seed },
        back: { ...seed },
      },
    ]),
  ) as FinishingMap;
}

export function createDraftFromPreferences(preferences: SessionPreferences): CredentialDraft {
  return {
    eventName: preferences.eventName,
    venue: preferences.venue,
    date: preferences.date || todayInputValue(),
    optionalText: preferences.optionalText,
    credentialTypes: orderedCredentialTypes(preferences.credentialTypes),
    eventType: preferences.eventType,
    venueType: preferences.venueType,
    retroverseStyle: preferences.retroverseStyle,
    id: null,
    artwork: {},
    finishing: createFinishingMap(preferences.lastFinishing),
    serials: {},
    createdDate: null,
    modifiedDate: null,
  };
}

export function draftFromRecord(record: CredentialRecord, duplicate = false): CredentialDraft {
  const finishing = createFinishingMap();
  for (const type of record.credentialTypes) {
    const stored = record.finishing[type];
    if (stored) {
      finishing[type] = {
        front: { ...DEFAULT_FINISHING, ...stored.front },
        back: { ...DEFAULT_FINISHING, ...stored.back },
      };
    }
  }
  const next = {
    ...cloneValue(record),
    id: duplicate ? null : record.id,
    finishing,
    createdDate: duplicate ? null : record.createdDate,
    modifiedDate: duplicate ? null : record.modifiedDate,
  };
  if (duplicate) next.serials = {};
  return next;
}

export function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

export function orderedCredentialTypes(values: readonly CredentialTypeId[]): CredentialTypeId[] {
  const selected = new Set(values);
  const ordered = CREDENTIAL_TYPES.map(({ value }) => value).filter((value) => selected.has(value));
  return ordered.length > 0 ? ordered : ["event"];
}

export function credentialTypeLabel(type: CredentialTypeId): string {
  return CREDENTIAL_TYPES.find((option) => option.value === type)?.label ?? type;
}

export function contextKey(fields: CredentialFields, credentialType?: CredentialTypeId): string {
  return [
    fields.eventName.trim(),
    fields.venue.trim(),
    fields.date,
    fields.optionalText.trim(),
    fields.eventType,
    fields.venueType,
    fields.retroverseStyle,
    credentialType ?? "",
  ].join("|");
}

export function faceKey(face: SelectedFace): string {
  return `${face.type}:${face.face}`;
}

export function allSelectedFaces(types: readonly CredentialTypeId[]): SelectedFace[] {
  return orderedCredentialTypes(types).flatMap((type) => [
    { type, face: "front" as const },
    { type, face: "back" as const },
  ]);
}

export function firstSelectedFace(types: readonly CredentialTypeId[]): SelectedFace {
  return { type: orderedCredentialTypes(types)[0] ?? "event", face: "front" };
}

export function artworkIsCurrent(draft: CredentialDraft, type: CredentialTypeId): boolean {
  const pair = draft.artwork[type];
  if (!pair) return false;
  const expected = contextKey(draft, type);
  return pair.front.contextKey === expected && pair.back.contextKey === expected;
}

export function selectedArtworkIsCurrent(draft: CredentialDraft): boolean {
  return draft.credentialTypes.every((type) => artworkIsCurrent(draft, type));
}

export function hasAnyArtwork(draft: CredentialDraft): boolean {
  return Object.values(draft.artwork).some(Boolean);
}

export function formatCredentialDate(value: string): string {
  if (!value) return "";
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function fieldsFromDraft(draft: CredentialDraft): CredentialFields {
  return {
    eventName: draft.eventName,
    venue: draft.venue,
    date: draft.date,
    optionalText: draft.optionalText,
    credentialTypes: orderedCredentialTypes(draft.credentialTypes),
    eventType: draft.eventType,
    venueType: draft.venueType,
    retroverseStyle: draft.retroverseStyle,
  };
}

export function preferencesFromDraft(draft: CredentialDraft, lastFinishing?: FinishingAdjustments): SessionPreferences {
  const first = firstSelectedFace(draft.credentialTypes);
  return {
    ...fieldsFromDraft(draft),
    lastFinishing: {
      ...(lastFinishing ?? draft.finishing[first.type][first.face] ?? DEFAULT_FINISHING),
    },
  };
}
