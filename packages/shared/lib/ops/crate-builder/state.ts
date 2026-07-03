import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import { PILE_COUNT } from "./deal";
import {
  emptySetOrder,
  insertIntoSetOrder,
  removeFromAllSetOrders,
  syncSetOrder,
} from "./order";
import { defaultSetColor, parseSetColorId } from "./set-colors";
import type { CrateBuilderFile, CrateSet } from "./types";

function statePath(year: number): string {
  return join(opsStateDir(), "crate-builder", `${year}.json`);
}

function defaultPiles(): CrateSet[] {
  return Array.from({ length: PILE_COUNT }, (_, i) => ({
    id: `pile-${i + 1}`,
    name: `Pile ${i + 1}`,
    colorId: defaultSetColor(i),
  }));
}

function emptyFile(year: number): CrateBuilderFile {
  const sets = defaultPiles();
  return {
    version: 3,
    year,
    sets,
    assignments: {},
    setOrder: emptySetOrder(sets),
    manualKeys: [],
    updatedAt: new Date().toISOString(),
  };
}

function normalizeManualKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((k): k is string => typeof k === "string" && k.trim().length > 0);
}

function normalizeSetOrder(raw: unknown, sets: CrateSet[]): Record<string, string[]> {
  const order = emptySetOrder(sets);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return order;
  const setIds = new Set(sets.map((s) => s.id));
  for (const [id, list] of Object.entries(raw as Record<string, unknown>)) {
    if (!setIds.has(id) || !Array.isArray(list)) continue;
    order[id] = list
      .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
      .map((k) => k.trim());
  }
  return order;
}

function normalizeSets(raw: unknown): CrateSet[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaultPiles();
  const sets = raw.map((s, i) => ({
    id:
      typeof s?.id === "string" && s.id.trim()
        ? s.id.trim()
        : `pile-${i + 1}`,
    name: typeof s?.name === "string" ? s.name : "",
    colorId: parseSetColorId(s?.colorId),
  }));
  return sets.length === PILE_COUNT ? sets : defaultPiles();
}

function migrateLegacy(raw: Record<string, unknown>, year: number): CrateBuilderFile {
  const file = emptyFile(year);
  const manualKeys = normalizeManualKeys(raw.manualKeys);

  const legacySets = Array.isArray(raw.sets)
    ? raw.sets
    : Array.isArray(raw.piles)
      ? raw.piles
      : [];
  if (legacySets.length > 0) {
    file.sets = normalizeSets(legacySets);
    if (file.sets.length !== PILE_COUNT) {
      file.sets = defaultPiles();
    }
  }

  const setIds = new Set(file.sets.map((s) => s.id));
  for (const [key, setId] of Object.entries((raw.assignments as Record<string, string>) ?? {})) {
    if (typeof key !== "string" || typeof setId !== "string") continue;
    const normalizedSetId = setId.replace(/^pile-/, "set-").replace(/^set-/, "pile-");
    const match =
      setIds.has(setId) ? setId : setIds.has(normalizedSetId) ? normalizedSetId : null;
    if (!match) continue;
    if (manualKeys.includes(key.trim())) {
      file.assignments[key.trim()] = match;
    }
  }

  file.manualKeys = manualKeys;
  file.setOrder = emptySetOrder(file.sets);
  syncSetOrder(file);
  return file;
}

function normalizeFile(raw: unknown, year: number): CrateBuilderFile {
  if (!raw || typeof raw !== "object") return emptyFile(year);
  const obj = raw as Record<string, unknown>;

  if (obj.version !== 3) {
    return migrateLegacy(obj, year);
  }

  const sets = normalizeSets(obj.sets);
  const setIds = new Set(sets.map((s) => s.id));

  const assignments: Record<string, string> = {};
  for (const [key, setId] of Object.entries(obj.assignments ?? {})) {
    if (typeof key !== "string" || !key.trim()) continue;
    if (typeof setId !== "string" || !setIds.has(setId)) continue;
    assignments[key.trim()] = setId;
  }

  const file: CrateBuilderFile = {
    version: 3,
    year,
    sets,
    assignments,
    setOrder: normalizeSetOrder(obj.setOrder, sets),
    manualKeys: normalizeManualKeys(obj.manualKeys),
    updatedAt:
      typeof obj.updatedAt === "string" && obj.updatedAt.trim()
        ? obj.updatedAt.trim()
        : new Date().toISOString(),
  };
  syncSetOrder(file);
  return file;
}

export async function loadCrateBuilderState(year: number): Promise<CrateBuilderFile> {
  try {
    const raw = await readFile(statePath(year), "utf8");
    return normalizeFile(JSON.parse(raw) as unknown, year);
  } catch {
    return emptyFile(year);
  }
}

export async function saveCrateBuilderState(file: CrateBuilderFile): Promise<void> {
  const dir = join(opsStateDir(), "crate-builder");
  await mkdir(dir, { recursive: true });
  syncSetOrder(file);
  file.updatedAt = new Date().toISOString();
  await writeFile(statePath(file.year), `${JSON.stringify(file, null, 2)}\n`, "utf8");
}

export async function renameCrateSet(
  year: number,
  setId: string,
  name: string,
): Promise<CrateBuilderFile> {
  const file = await loadCrateBuilderState(year);
  file.sets = file.sets.map((s) => (s.id === setId ? { ...s, name: name.trim() } : s));
  await saveCrateBuilderState(file);
  return file;
}

export async function setCrateSetColor(
  year: number,
  setId: string,
  colorId: string,
): Promise<CrateBuilderFile> {
  const file = await loadCrateBuilderState(year);
  const parsed = parseSetColorId(colorId);
  file.sets = file.sets.map((s) => (s.id === setId ? { ...s, colorId: parsed } : s));
  await saveCrateBuilderState(file);
  return file;
}

export async function assignCrateSong(
  year: number,
  songKey: string,
  setId: string | null,
  insertBefore: string | null = null,
): Promise<{ file: CrateBuilderFile; fromSetId: string | null }> {
  const file = await loadCrateBuilderState(year);
  const key = songKey.trim();
  if (!key) return { file, fromSetId: null };

  const fromSetId = file.assignments[key] ?? null;

  if (setId == null) {
    return { file, fromSetId };
  }

  const valid = file.sets.some((s) => s.id === setId);
  if (!valid) return { file, fromSetId };

  removeFromAllSetOrders(file.setOrder, key);
  file.assignments[key] = setId;
  const order = file.setOrder[setId] ?? [];
  file.setOrder[setId] = insertIntoSetOrder(order, key, insertBefore);

  if (!file.manualKeys.includes(key)) {
    file.manualKeys.push(key);
  }

  await saveCrateBuilderState(file);
  return { file, fromSetId };
}
