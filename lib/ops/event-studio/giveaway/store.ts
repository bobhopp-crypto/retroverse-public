import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";
import { pgSundayNightsGet, pgSundayNightsSet } from "@/lib/sunday-nights/pg-state";
import { usePostgresSundayNightsState } from "@/lib/sunday-nights/storage-mode";

import { createDefaultGiveaway } from "./defaults";
import type { Giveaway, GiveawayDrawRecord, GiveawayStudioState } from "./types";

const PG_KEY_PREFIX = "eventStudioGiveaway:";

function statePath(eventKey: string): string {
  return join(opsStateDir(), "event-studio", "giveaway", `${eventKey}.json`);
}

function entriesPath(eventKey: string): string {
  return join(opsStateDir(), "event-studio", "giveaway", `${eventKey}.entries.json`);
}

function pgKey(eventKey: string): string {
  return `${PG_KEY_PREFIX}${eventKey}`;
}

function normalizeDraw(raw: unknown): GiveawayDrawRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<GiveawayDrawRecord>;
  if (typeof obj.id !== "string" || typeof obj.giveawayId !== "string" || typeof obj.entryId !== "string") {
    return null;
  }
  const status = obj.status;
  if (
    status !== "pending" &&
    status !== "claimed" &&
    status !== "redrawn" &&
    status !== "not_present" &&
    status !== "completed" &&
    status !== "disqualified"
  ) {
    return null;
  }
  return {
    id: obj.id,
    giveawayId: obj.giveawayId,
    entryId: obj.entryId,
    drawnAt: typeof obj.drawnAt === "string" ? obj.drawnAt : new Date().toISOString(),
    status,
    notes: typeof obj.notes === "string" ? obj.notes : "",
  };
}

function normalizeGiveaway(raw: unknown, eventKey: string): Giveaway | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<Giveaway>;
  if (typeof obj.id !== "string") return null;
  const fallback = createDefaultGiveaway(eventKey, eventKey, eventKey);
  const status = obj.status;
  return {
    id: obj.id,
    eventKey,
    title: typeof obj.title === "string" && obj.title.trim() ? obj.title.trim() : fallback.title,
    status:
      status === "live" || status === "drawing" || status === "completed" || status === "archived"
        ? status
        : "draft",
    prize: {
      ...fallback.prize,
      ...(obj.prize && typeof obj.prize === "object" ? obj.prize : {}),
      galleryImageUrls: Array.isArray((obj.prize as Giveaway["prize"] | undefined)?.galleryImageUrls)
        ? ((obj.prize as Giveaway["prize"]).galleryImageUrls ?? []).filter((v) => typeof v === "string")
        : [],
    },
    registration: {
      ...fallback.registration,
      ...(obj.registration && typeof obj.registration === "object" ? obj.registration : {}),
      fields: Array.isArray((obj.registration as Giveaway["registration"] | undefined)?.fields)
        ? (obj.registration as Giveaway["registration"]).fields
        : fallback.registration.fields,
    },
    rules: typeof obj.rules === "string" ? obj.rules : fallback.rules,
    scheduledDrawAt: typeof obj.scheduledDrawAt === "string" ? obj.scheduledDrawAt : null,
    createdAt: typeof obj.createdAt === "string" ? obj.createdAt : fallback.createdAt,
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : fallback.updatedAt,
  };
}

function normalizeState(raw: unknown, eventKey: string): GiveawayStudioState {
  if (!raw || typeof raw !== "object") {
    const giveaway = createDefaultGiveaway(eventKey, eventKey, eventKey);
    return {
      version: 1,
      eventKey,
      activeGiveawayId: giveaway.id,
      giveaways: [giveaway],
      draws: [],
      updatedAt: new Date().toISOString(),
    };
  }

  const obj = raw as Partial<GiveawayStudioState>;
  const giveaways = (obj.giveaways ?? [])
    .map((entry) => normalizeGiveaway(entry, eventKey))
    .filter((entry): entry is Giveaway => entry != null);

  if (giveaways.length === 0) {
    const giveaway = createDefaultGiveaway(eventKey, eventKey, eventKey);
    giveaways.push(giveaway);
  }

  const activeGiveawayId =
    typeof obj.activeGiveawayId === "string" &&
    giveaways.some((giveaway) => giveaway.id === obj.activeGiveawayId)
      ? obj.activeGiveawayId
      : giveaways[0]!.id;

  return {
    version: 1,
    eventKey,
    activeGiveawayId,
    giveaways,
    draws: (obj.draws ?? []).map(normalizeDraw).filter((draw): draw is GiveawayDrawRecord => draw != null),
    updatedAt:
      typeof obj.updatedAt === "string" && obj.updatedAt.trim()
        ? obj.updatedAt
        : new Date().toISOString(),
  };
}

async function loadFromJson(eventKey: string): Promise<GiveawayStudioState> {
  try {
    const raw = await readFile(statePath(eventKey), "utf8");
    return normalizeState(JSON.parse(raw), eventKey);
  } catch {
    return normalizeState(null, eventKey);
  }
}

async function saveToJson(state: GiveawayStudioState): Promise<void> {
  const dir = join(opsStateDir(), "event-studio", "giveaway");
  await mkdir(dir, { recursive: true });
  await writeFile(statePath(state.eventKey), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function persist(state: GiveawayStudioState): Promise<GiveawayStudioState> {
  const next = { ...state, updatedAt: new Date().toISOString() };
  if (usePostgresSundayNightsState()) {
    await pgSundayNightsSet(pgKey(state.eventKey), next as unknown as Record<string, unknown>);
    return next;
  }
  await saveToJson(next);
  return next;
}

export async function loadGiveawayStudioState(eventKey: string): Promise<GiveawayStudioState> {
  if (usePostgresSundayNightsState()) {
    const raw = await pgSundayNightsGet<Record<string, unknown>>(pgKey(eventKey));
    return normalizeState(raw, eventKey);
  }
  return loadFromJson(eventKey);
}

export async function saveGiveawayStudioState(state: GiveawayStudioState): Promise<GiveawayStudioState> {
  return persist(state);
}

export function getActiveGiveaway(state: GiveawayStudioState): Giveaway | null {
  return state.giveaways.find((giveaway) => giveaway.id === state.activeGiveawayId) ?? state.giveaways[0] ?? null;
}

export function updateGiveawayInState(
  state: GiveawayStudioState,
  giveawayId: string,
  patch: Partial<Giveaway>,
): GiveawayStudioState {
  return {
    ...state,
    giveaways: state.giveaways.map((giveaway) =>
      giveaway.id === giveawayId
        ? { ...giveaway, ...patch, updatedAt: new Date().toISOString() }
        : giveaway,
    ),
  };
}

export function entriesFilePath(eventKey: string): string {
  return entriesPath(eventKey);
}
