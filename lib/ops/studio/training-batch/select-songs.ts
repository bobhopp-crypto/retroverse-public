import "server-only";

import { readFile, writeFile } from "fs/promises";
import { join } from "path";

import { loadBrowserPlus2Model } from "@/lib/ops/browser-plus-2/load-browser-plus-2";
import { loadBp2PackageHints } from "@/lib/ops/browser-plus-2/load-package-hints";
import { isActiveVideoRow } from "@/lib/ops/browser-plus-2/status";
import { editorOutputPath } from "@/lib/ops/studio/editor/paths";
import { loadMuseumPilotRegistry } from "@/lib/retroverse/renderer/museum-pilot-registry";

import type { SelectedTrainingSong } from "./types";

const PLAY_MIN = 10;
const PLAY_MAX = 20;
const TARGET = 50;

const SHOWCASE_RVTRS = new Set(["RVTR417030"]);

async function isShowcaseRvtr(rvtr: string): Promise<boolean> {
  if (SHOWCASE_RVTRS.has(rvtr)) return true;
  try {
    const pilot = await loadMuseumPilotRegistry();
    if (pilot?.showcaseRvtr?.toUpperCase() === rvtr) return true;
  } catch {
    /* ignore */
  }
  try {
    const raw = await readFile(editorOutputPath(rvtr), "utf8");
    const editor = JSON.parse(raw) as { meta?: { editorialStatus?: string } };
    if (editor.meta?.editorialStatus === "showcase_curation") return true;
  } catch {
    /* no editor */
  }
  return false;
}

export type SongSelectionResult = {
  targetCount: number;
  selectedCount: number;
  criteria: {
    playCountMin: number;
    playCountMax: number;
    requiresVideo: boolean;
    requiresRvtr: boolean;
    excludeShowcase: boolean;
    preferChartHistory: boolean;
  };
  songs: SelectedTrainingSong[];
  gapNote: string | null;
};

export async function selectTrainingBatchSongs(): Promise<SongSelectionResult> {
  const [model, packageHints] = await Promise.all([
    loadBrowserPlus2Model(),
    loadBp2PackageHints(),
  ]);

  const candidates: SelectedTrainingSong[] = [];

  for (const row of model.rows) {
    if (!row.rvtr || !isActiveVideoRow(row)) continue;
    const rvtr = row.rvtr.trim().toUpperCase();
    const playCount = row.playCount ?? null;
    if (playCount == null || playCount < PLAY_MIN || playCount > PLAY_MAX) continue;
    if (!row.filePath?.trim()) continue;
    if (await isShowcaseRvtr(rvtr)) continue;

    const hint = packageHints.get(rvtr);
    candidates.push({
      rvtr,
      artist: row.artist,
      title: row.title,
      playCount,
      filePath: row.filePath,
      chartHistoryCount: hint?.chartHistoryCount ?? 0,
      hasExistingCollector: row.studio.needsCollector === false,
    });
  }

  candidates.sort((a, b) => {
    const chart = b.chartHistoryCount - a.chartHistoryCount;
    if (chart !== 0) return chart;
    return (b.playCount ?? 0) - (a.playCount ?? 0);
  });

  const songs = candidates.slice(0, TARGET);
  const gapNote =
    songs.length < TARGET
      ? `Only ${songs.length} songs met strict criteria (play ${PLAY_MIN}–${PLAY_MAX}, video, RVTR, non-showcase). Target was ${TARGET}.`
      : null;

  return {
    targetCount: TARGET,
    selectedCount: songs.length,
    criteria: {
      playCountMin: PLAY_MIN,
      playCountMax: PLAY_MAX,
      requiresVideo: true,
      requiresRvtr: true,
      excludeShowcase: true,
      preferChartHistory: true,
    },
    songs,
    gapNote,
  };
}

export async function persistSongSelection(
  selection: SongSelectionResult,
  reportDir: string,
): Promise<string> {
  const path = join(reportDir, "SONG_SELECTION.csv");
  const header = "rvtr,artist,title,play_count,file_path,chart_history_count,has_existing_collector";
  const lines = selection.songs.map(
    (s) =>
      [
        s.rvtr,
        `"${s.artist.replace(/"/g, '""')}"`,
        `"${s.title.replace(/"/g, '""')}"`,
        s.playCount ?? "",
        `"${s.filePath.replace(/"/g, '""')}"`,
        s.chartHistoryCount,
        s.hasExistingCollector ? "yes" : "no",
      ].join(","),
  );
  await writeFile(path, `${[header, ...lines].join("\n")}\n`, "utf8");
  return path;
}

export async function loadSongSelectionFromCsv(reportDir: string): Promise<SelectedTrainingSong[]> {
  const path = join(reportDir, "SONG_SELECTION.csv");
  const raw = await readFile(path, "utf8");
  const lines = raw.trim().split("\n").slice(1);
  return lines.map((line) => {
    const parts = line.match(/("(?:[^"]|"")*"|[^,]+)/g) ?? [];
    const unquote = (v: string) => v.replace(/^"|"$/g, "").replace(/""/g, '"');
    return {
      rvtr: parts[0]?.trim() ?? "",
      artist: unquote(parts[1]?.trim() ?? ""),
      title: unquote(parts[2]?.trim() ?? ""),
      playCount: parts[3] ? Number(parts[3]) : null,
      filePath: unquote(parts[4]?.trim() ?? ""),
      chartHistoryCount: Number(parts[5] ?? 0),
      hasExistingCollector: (parts[6]?.trim() ?? "") === "yes",
    };
  });
}
