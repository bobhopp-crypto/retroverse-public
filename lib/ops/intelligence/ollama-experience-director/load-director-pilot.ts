import { readFile } from "fs/promises";

import {
  bundledDirectorPilotOutputDir,
  bundledDirectorPilotOutputPath,
  directorPilotOutputDir,
  directorPilotOutputPath,
  directorPilotReportsDir,
} from "./write-director-output";
import type { DirectorPilotBundle, DirectorRunResult, DirectorSongOutput, PilotSelection } from "./types";

async function readJson<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function loadDirectorOutput(rvtr: string): Promise<DirectorSongOutput | null> {
  const id = rvtr.trim().toUpperCase();
  for (const path of [bundledDirectorPilotOutputPath(id), directorPilotOutputPath(id)]) {
    const data = await readJson<DirectorSongOutput>(path);
    if (data?.rvtr) return data;
  }
  return null;
}

/** Build run results from on-disk director JSON (for report after partial runs). */
export async function buildDirectorResultsFromDisk(
  selection: PilotSelection,
): Promise<DirectorRunResult[]> {
  const results: DirectorRunResult[] = [];
  for (const song of selection.songs) {
    const output = await loadDirectorOutput(song.rvtr);
    results.push({
      rvtr: song.rvtr,
      ok: Boolean(output),
      output,
      error: output ? null : "No director output file",
      model: null,
      ranAt: selection.selectedAt,
    });
  }
  return results;
}

/** Load pilot selection + director outputs for ops review page. */
export async function loadDirectorPilotBundle(): Promise<DirectorPilotBundle | null> {
  const selectionPath = `${directorPilotReportsDir()}/selected-songs.json`;
  const selection = await readJson<PilotSelection>(selectionPath);
  if (!selection?.songs?.length) return null;

  const outputs: DirectorSongOutput[] = [];
  const results: DirectorRunResult[] = [];

  for (const song of selection.songs) {
    const output = await loadDirectorOutput(song.rvtr);
    if (output) {
      outputs.push(output);
      results.push({
        rvtr: song.rvtr,
        ok: true,
        output,
        error: null,
        model: null,
        ranAt: selection.selectedAt,
      });
    } else {
      results.push({
        rvtr: song.rvtr,
        ok: false,
        output: null,
        error: "No director output file",
        model: null,
        ranAt: selection.selectedAt,
      });
    }
  }

  return { selection, results, outputs };
}

export { bundledDirectorPilotOutputDir, directorPilotOutputDir, directorPilotReportsDir };
