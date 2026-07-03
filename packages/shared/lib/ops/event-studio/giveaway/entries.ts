import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

import { randomUUID } from "crypto";

import { pgSundayNightsGet, pgSundayNightsSet } from "@/lib/sunday-nights/pg-state";
import { usePostgresSundayNightsState } from "@/lib/sunday-nights/storage-mode";

import { entriesFilePath } from "./store";
import type { GiveawayEntry, GiveawayManualEntryPayload, GiveawayRegistrationField } from "./types";

const PG_ENTRIES_PREFIX = "eventStudioGiveawayEntries:";

function pgEntriesKey(eventKey: string): string {
  return `${PG_ENTRIES_PREFIX}${eventKey}`;
}

function normalizeEntry(raw: unknown): GiveawayEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<GiveawayEntry>;
  if (typeof obj.id !== "string" || typeof obj.giveawayId !== "string" || typeof obj.firstName !== "string") {
    return null;
  }
  return {
    id: obj.id,
    giveawayId: obj.giveawayId,
    eventKey: typeof obj.eventKey === "string" ? obj.eventKey : "",
    firstName: obj.firstName.trim(),
    lastName: typeof obj.lastName === "string" ? obj.lastName.trim() : "",
    email: typeof obj.email === "string" ? obj.email.trim().toLowerCase() : null,
    phone: typeof obj.phone === "string" ? obj.phone.trim() : null,
    birthday: typeof obj.birthday === "string" ? obj.birthday.trim() : null,
    favoriteDecade: typeof obj.favoriteDecade === "string" ? obj.favoriteDecade.trim() : null,
    favoriteArtist: typeof obj.favoriteArtist === "string" ? obj.favoriteArtist.trim() : null,
    favoriteGenre: typeof obj.favoriteGenre === "string" ? obj.favoriteGenre.trim() : null,
    newsletterOptIn: obj.newsletterOptIn === true,
    source: obj.source === "manual" || obj.source === "pass" ? obj.source : "qr",
    duplicateOf: typeof obj.duplicateOf === "string" ? obj.duplicateOf : null,
    createdAt: typeof obj.createdAt === "string" ? obj.createdAt : new Date().toISOString(),
  };
}

function normalizeEntries(raw: unknown): GiveawayEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeEntry).filter((entry): entry is GiveawayEntry => entry != null);
}

function entryKey(entry: Pick<GiveawayEntry, "email" | "phone" | "firstName" | "lastName">): string {
  if (entry.email) return `email:${entry.email}`;
  if (entry.phone) return `phone:${entry.phone}`;
  return `name:${entry.firstName.toLowerCase()}|${entry.lastName.toLowerCase()}`;
}

function markDuplicates(entries: GiveawayEntry[]): GiveawayEntry[] {
  const seen = new Map<string, string>();
  return entries.map((entry) => {
    const key = entryKey(entry);
    const firstId = seen.get(key);
    if (!firstId) {
      seen.set(key, entry.id);
      return { ...entry, duplicateOf: null };
    }
    return { ...entry, duplicateOf: firstId };
  });
}

async function loadEntriesFromJson(eventKey: string): Promise<GiveawayEntry[]> {
  try {
    const raw = await readFile(entriesFilePath(eventKey), "utf8");
    return markDuplicates(normalizeEntries(JSON.parse(raw)));
  } catch {
    return [];
  }
}

async function saveEntriesToJson(eventKey: string, entries: GiveawayEntry[]): Promise<void> {
  const path = entriesFilePath(eventKey);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
}

async function persistEntries(eventKey: string, entries: GiveawayEntry[]): Promise<GiveawayEntry[]> {
  const normalized = markDuplicates(entries);
  if (usePostgresSundayNightsState()) {
    await pgSundayNightsSet(pgEntriesKey(eventKey), {
      entries: normalized,
    } as Record<string, unknown>);
    return normalized;
  }
  await saveEntriesToJson(eventKey, normalized);
  return normalized;
}

export async function loadGiveawayEntries(eventKey: string): Promise<GiveawayEntry[]> {
  if (usePostgresSundayNightsState()) {
    const raw = await pgSundayNightsGet<{ entries?: unknown }>(pgEntriesKey(eventKey));
    return markDuplicates(normalizeEntries(raw?.entries));
  }
  return loadEntriesFromJson(eventKey);
}

export async function listGiveawayEntries(
  eventKey: string,
  giveawayId: string,
  search = "",
): Promise<GiveawayEntry[]> {
  const needle = search.trim().toLowerCase();
  const entries = (await loadGiveawayEntries(eventKey)).filter((entry) => entry.giveawayId === giveawayId);
  if (!needle) return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return entries
    .filter((entry) => {
      const haystack = [
        entry.firstName,
        entry.lastName,
        entry.email ?? "",
        entry.phone ?? "",
        entry.favoriteArtist ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function fieldEnabled(fields: GiveawayRegistrationField[], id: GiveawayRegistrationField["id"]): boolean {
  return fields.some((field) => field.id === id && field.enabled);
}

export async function addManualGiveawayEntry(
  eventKey: string,
  payload: GiveawayManualEntryPayload,
  fields: GiveawayRegistrationField[],
  source: GiveawayEntry["source"] = "manual",
): Promise<{ entry: GiveawayEntry; entries: GiveawayEntry[] }> {
  const firstName = payload.firstName.trim();
  if (!firstName) throw new Error("First name is required");

  const entry: GiveawayEntry = {
    id: randomUUID(),
    giveawayId: payload.giveawayId,
    eventKey,
    firstName,
    lastName: payload.lastName?.trim() ?? "",
    email: fieldEnabled(fields, "email") ? payload.email?.trim().toLowerCase() ?? null : null,
    phone: fieldEnabled(fields, "phone") ? payload.phone?.trim() ?? null : null,
    birthday: fieldEnabled(fields, "birthday") ? payload.birthday?.trim() ?? null : null,
    favoriteDecade: fieldEnabled(fields, "favoriteDecade") ? payload.favoriteDecade?.trim() ?? null : null,
    favoriteArtist: fieldEnabled(fields, "favoriteArtist") ? payload.favoriteArtist?.trim() ?? null : null,
    favoriteGenre: fieldEnabled(fields, "favoriteGenre") ? payload.favoriteGenre?.trim() ?? null : null,
    newsletterOptIn: fieldEnabled(fields, "newsletterOptIn") ? payload.newsletterOptIn === true : false,
    source,
    duplicateOf: null,
    createdAt: new Date().toISOString(),
  };

  const all = await loadGiveawayEntries(eventKey);
  const next = markDuplicates([entry, ...all]);
  await persistEntries(eventKey, next);
  return { entry, entries: next.filter((row) => row.giveawayId === payload.giveawayId) };
}

export function countDuplicateEntries(entries: GiveawayEntry[]): number {
  return entries.filter((entry) => entry.duplicateOf).length;
}

export function countUniqueEntries(entries: GiveawayEntry[]): number {
  return entries.filter((entry) => !entry.duplicateOf).length;
}

export async function addPublicGiveawayEntry(
  eventKey: string,
  payload: GiveawayManualEntryPayload,
  fields: GiveawayRegistrationField[],
): Promise<GiveawayEntry> {
  return (await addManualGiveawayEntry(eventKey, payload, fields, "qr")).entry;
}
