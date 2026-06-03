import { SHOW_SET_TEMPLATES } from "./templates";
import { loadYearPool } from "./parse-vdjfolder";
import { scanAvailableYears } from "./scan-my-lists";
import { loadProjectFile } from "./state";
import type {
  FlowEntry,
  ShowBuilderPayload,
  ShowSet,
  VdjPoolSong,
} from "./types";
import { vdjMyListsDir } from "./vdj-paths";

export async function loadShowBuilderProject(): Promise<ShowBuilderPayload> {
  const availableYears = await scanAvailableYears();
  const project = await loadProjectFile();

  const pools: Record<number, VdjPoolSong[]> = {};
  const catalog = new Map<string, VdjPoolSong>();

  await Promise.all(
    project.selectedYears.map(async (year) => {
      try {
        const songs = await loadYearPool(year);
        pools[year] = songs;
        for (const s of songs) catalog.set(s.key, s);
      } catch {
        pools[year] = [];
      }
    }),
  );

  const unassigned: Record<number, VdjPoolSong[]> = {};
  for (const year of project.selectedYears) {
    unassigned[year] = (pools[year] ?? []).filter((s) => !project.assignments[s.key]);
  }

  const counts = new Map<string, number>();
  for (const s of project.sets) counts.set(s.id, 0);
  for (const setId of Object.values(project.assignments)) {
    counts.set(setId, (counts.get(setId) ?? 0) + 1);
  }

  const sets: ShowSet[] = project.sets.map((s) => ({
    id: s.id,
    name: s.name,
    collapsed: s.collapsed === true,
    count: counts.get(s.id) ?? 0,
  }));

  const setNameById = new Map(sets.map((s) => [s.id, s.name]));
  const flow: FlowEntry[] = project.flow.map((e) => {
    if (e.type === "transition") {
      return { type: "transition", id: e.id, note: e.note };
    }
    return {
      type: "set",
      setId: e.setId,
      name: setNameById.get(e.setId) ?? "Missing set",
    };
  });

  return {
    ok: true,
    availableYears,
    selectedYears: project.selectedYears,
    templates: [...SHOW_SET_TEMPLATES],
    sets,
    pools,
    unassigned,
    assignments: project.assignments,
    songOrder: project.songOrder,
    flow,
    myListsPath: vdjMyListsDir(),
  };
}
