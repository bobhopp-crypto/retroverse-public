import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import { insertIntoOrder, removeFromAllOrders, syncSongOrder } from "./order";
import { scanAvailableYears } from "./scan-my-lists";
import type { ShowBuilderProjectFile } from "./types";

function projectPath(): string {
  return join(opsStateDir(), "show-builder", "project.json");
}

function newSetId(): string {
  return `set-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function newTransitionId(): string {
  return `tr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function defaultSets(): ShowBuilderProjectFile["sets"] {
  return [
    { id: "set-1", name: "Set 1" },
    { id: "set-2", name: "Set 2" },
    { id: "set-3", name: "Set 3" },
  ];
}

export function emptyProject(selectedYears: number[] = []): ShowBuilderProjectFile {
  const sets = defaultSets();
  const songOrder: Record<string, string[]> = {};
  for (const s of sets) songOrder[s.id] = [];
  return {
    version: 2,
    selectedYears,
    sets,
    assignments: {},
    songOrder,
    flow: [],
    updatedAt: new Date().toISOString(),
  };
}

function normalizeProject(raw: unknown, availableYears: number[]): ShowBuilderProjectFile {
  if (!raw || typeof raw !== "object") {
    const defaults = [1967, 1978, 1992].filter((y) => availableYears.includes(y));
    return emptyProject(defaults);
  }
  const obj = raw as Partial<ShowBuilderProjectFile>;
  if (obj.version !== 2) {
    const defaults = [1967, 1978, 1992].filter((y) => availableYears.includes(y));
    return emptyProject(defaults);
  }

  const available = new Set(availableYears);
  const selectedYears = Array.isArray(obj.selectedYears)
    ? obj.selectedYears.filter((y) => typeof y === "number" && available.has(y))
    : [];

  const sets =
    Array.isArray(obj.sets) && obj.sets.length > 0
      ? obj.sets
          .map((s) => {
            if (!s || typeof s !== "object") return null;
            const row = s as { id?: unknown; name?: unknown; collapsed?: unknown };
            const id = typeof row.id === "string" ? row.id.trim() : "";
            if (!id) return null;
            return {
              id,
              name:
                typeof row.name === "string" && row.name.trim()
                  ? row.name.trim()
                  : "Untitled set",
              collapsed: row.collapsed === true,
            };
          })
          .filter((s): s is NonNullable<typeof s> => s != null)
      : defaultSets();

  const setIds = new Set(sets.map((s) => s.id));
  const assignments: Record<string, string> = {};
  for (const [key, setId] of Object.entries(obj.assignments ?? {})) {
    if (!key.trim() || typeof setId !== "string" || !setIds.has(setId)) continue;
    assignments[key.trim()] = setId;
  }

  const songOrder: Record<string, string[]> = {};
  if (obj.songOrder && typeof obj.songOrder === "object") {
    for (const [id, list] of Object.entries(obj.songOrder)) {
      if (!setIds.has(id) || !Array.isArray(list)) continue;
      songOrder[id] = list.filter((k): k is string => typeof k === "string" && k.trim().length > 0);
    }
  }

  const flow: ShowBuilderProjectFile["flow"] = [];
  if (Array.isArray(obj.flow)) {
    for (const item of obj.flow) {
      if (!item || typeof item !== "object") continue;
      if (item.type === "set" && typeof item.setId === "string" && setIds.has(item.setId)) {
        flow.push({ type: "set", setId: item.setId });
      } else if (
        item.type === "transition" &&
        typeof item.id === "string" &&
        typeof item.note === "string"
      ) {
        flow.push({ type: "transition", id: item.id, note: item.note });
      }
    }
  }

  const file: ShowBuilderProjectFile = {
    version: 2,
    selectedYears,
    sets,
    assignments,
    songOrder,
    flow,
    updatedAt:
      typeof obj.updatedAt === "string" && obj.updatedAt.trim()
        ? obj.updatedAt.trim()
        : new Date().toISOString(),
  };
  syncSongOrder(file.sets, file.assignments, file.songOrder);
  return file;
}

export async function loadProjectFile(): Promise<ShowBuilderProjectFile> {
  const availableYears = await scanAvailableYears();
  try {
    const raw = await readFile(projectPath(), "utf8");
    return normalizeProject(JSON.parse(raw) as unknown, availableYears);
  } catch {
    const defaults = [1967, 1978, 1992].filter((y) => availableYears.includes(y));
    return emptyProject(defaults);
  }
}

export async function saveProjectFile(file: ShowBuilderProjectFile): Promise<void> {
  const dir = join(opsStateDir(), "show-builder");
  await mkdir(dir, { recursive: true });
  syncSongOrder(file.sets, file.assignments, file.songOrder);
  file.updatedAt = new Date().toISOString();
  await writeFile(projectPath(), `${JSON.stringify(file, null, 2)}\n`, "utf8");
}

export async function setSelectedYears(years: number[]): Promise<ShowBuilderProjectFile> {
  const availableYears = await scanAvailableYears();
  const allowed = new Set(availableYears);
  const file = await loadProjectFile();
  file.selectedYears = years.filter((y) => allowed.has(y));
  await saveProjectFile(file);
  return file;
}

export async function createShowSet(name: string): Promise<ShowBuilderProjectFile> {
  const file = await loadProjectFile();
  const id = newSetId();
  file.sets.push({ id, name: name.trim() || "Untitled set", collapsed: false });
  file.songOrder[id] = [];
  await saveProjectFile(file);
  return file;
}

export async function deleteShowSet(setId: string): Promise<ShowBuilderProjectFile> {
  const file = await loadProjectFile();
  file.sets = file.sets.filter((s) => s.id !== setId);
  delete file.songOrder[setId];
  for (const [key, sid] of Object.entries(file.assignments)) {
    if (sid === setId) delete file.assignments[key];
  }
  file.flow = file.flow.filter((e) => e.type !== "set" || e.setId !== setId);
  await saveProjectFile(file);
  return file;
}

export async function renameShowSet(setId: string, name: string): Promise<ShowBuilderProjectFile> {
  const file = await loadProjectFile();
  const trimmed = name.trim();
  if (!trimmed) return file;
  file.sets = file.sets.map((s) => (s.id === setId ? { ...s, name: trimmed } : s));
  await saveProjectFile(file);
  return file;
}

export async function toggleSetCollapsed(
  setId: string,
  collapsed: boolean,
): Promise<ShowBuilderProjectFile> {
  const file = await loadProjectFile();
  file.sets = file.sets.map((s) => (s.id === setId ? { ...s, collapsed } : s));
  await saveProjectFile(file);
  return file;
}

export async function assignShowSong(
  workspaceKey: string,
  setId: string | null,
  insertBefore: string | null = null,
): Promise<ShowBuilderProjectFile> {
  const file = await loadProjectFile();
  const key = workspaceKey.trim();
  if (!key) return file;

  removeFromAllOrders(file.songOrder, key);

  if (setId == null) {
    delete file.assignments[key];
  } else {
    if (!file.sets.some((s) => s.id === setId)) return file;
    file.assignments[key] = setId;
    const order = file.songOrder[setId] ?? [];
    file.songOrder[setId] = insertIntoOrder(order, key, insertBefore);
  }

  await saveProjectFile(file);
  return file;
}

export async function reorderShowFlow(
  flow: ShowBuilderProjectFile["flow"],
): Promise<ShowBuilderProjectFile> {
  const file = await loadProjectFile();
  const setIds = new Set(file.sets.map((s) => s.id));
  file.flow = flow.filter((e) => {
    if (e.type === "set") return setIds.has(e.setId);
    return e.type === "transition" && e.id && e.note != null;
  });
  await saveProjectFile(file);
  return file;
}

export async function addFlowSet(setId: string): Promise<ShowBuilderProjectFile> {
  const file = await loadProjectFile();
  if (!file.sets.some((s) => s.id === setId)) return file;
  if (!file.flow.some((e) => e.type === "set" && e.setId === setId)) {
    file.flow.push({ type: "set", setId });
  }
  await saveProjectFile(file);
  return file;
}

export async function removeFlowSet(setId: string): Promise<ShowBuilderProjectFile> {
  const file = await loadProjectFile();
  file.flow = file.flow.filter((e) => e.type !== "set" || e.setId !== setId);
  await saveProjectFile(file);
  return file;
}

export async function addFlowTransition(note: string): Promise<ShowBuilderProjectFile> {
  const file = await loadProjectFile();
  file.flow.push({
    type: "transition",
    id: newTransitionId(),
    note: note.trim() || "Transition",
  });
  await saveProjectFile(file);
  return file;
}

export async function updateFlowTransition(
  id: string,
  note: string,
): Promise<ShowBuilderProjectFile> {
  const file = await loadProjectFile();
  file.flow = file.flow.map((e) =>
    e.type === "transition" && e.id === id ? { ...e, note: note.trim() || "Transition" } : e,
  );
  await saveProjectFile(file);
  return file;
}

export async function removeFlowTransition(id: string): Promise<ShowBuilderProjectFile> {
  const file = await loadProjectFile();
  file.flow = file.flow.filter((e) => e.type !== "transition" || e.id !== id);
  await saveProjectFile(file);
  return file;
}
