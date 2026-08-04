import "server-only";

import { readFile } from "fs/promises";

import { classifyAudioReadiness } from "./audio/classify-readiness";
import { writeJsonAtomic } from "./atomic-json";
import { mediaCoverageIndexPath, scanPath } from "./paths";
import type {
  AudioReadinessScan,
  AudioReadinessSummary,
  CoverageScanIndexEntry,
  OperatorDecisionAction,
  OperatorDecisionEvent,
} from "./types";

export type CoverageIndexFile = {
  version: 2;
  updatedAt: string;
  scans: CoverageScanIndexEntry[];
};

function emptyIndex(): CoverageIndexFile {
  return { version: 2, updatedAt: new Date().toISOString(), scans: [] };
}

export function summarizeAudioReadiness(scan: Pick<AudioReadinessScan, "results">): AudioReadinessSummary {
  const summary: AudioReadinessSummary = {
    total: scan.results.length,
    ready: 0,
    review: 0,
    upgrade_recommended: 0,
    alternate_only: 0,
    missing: 0,
    skipped: 0,
    decisions: 0,
  };
  for (const result of scan.results) {
    if (result.effectiveStatus === "skipped") summary.skipped += 1;
    else summary[result.effectiveStatus] += 1;
    if (result.currentDecision) summary.decisions += 1;
  }
  return summary;
}

export async function loadCoverageIndex(): Promise<CoverageIndexFile> {
  try {
    const parsed = JSON.parse(await readFile(mediaCoverageIndexPath(), "utf8")) as {
      version?: number;
      updatedAt?: string;
      scans?: CoverageScanIndexEntry[];
    };
    if (![1, 2].includes(parsed.version ?? 0) || !Array.isArray(parsed.scans)) return emptyIndex();
    return {
      version: 2,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      scans: parsed.scans.map((scan) => ({
        ...scan,
        targetType: scan.targetType ?? "vdj_mylist",
        label: scan.label ?? scan.myListName ?? scan.id,
      })),
    };
  } catch {
    return emptyIndex();
  }
}

export async function saveCoverageIndex(index: CoverageIndexFile): Promise<void> {
  index.version = 2;
  await writeJsonAtomic(mediaCoverageIndexPath(), index);
}

export async function listSavedScans(): Promise<CoverageScanIndexEntry[]> {
  return (await loadCoverageIndex()).scans;
}

export async function loadAudioReadinessScan(scanId: string): Promise<AudioReadinessScan | null> {
  try {
    const parsed = JSON.parse(await readFile(scanPath(scanId), "utf8")) as AudioReadinessScan;
    return parsed.version === 1 && parsed.mode === "audio_readiness" ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveAudioReadinessScan(scan: AudioReadinessScan): Promise<void> {
  scan.summary = summarizeAudioReadiness(scan);
  scan.updatedAt = new Date().toISOString();
  await writeJsonAtomic(scanPath(scan.id), scan);
  const index = await loadCoverageIndex();
  const entry: CoverageScanIndexEntry = {
    id: scan.id,
    targetType: "vdj_mylist",
    label: scan.myList.name,
    selectionKey: `vdj_mylist:${scan.myList.name}`,
    myListName: scan.myList.name,
    createdAt: scan.createdAt,
    updatedAt: scan.updatedAt,
    summary: scan.summary,
    inventoryFingerprint: scan.inventory.fingerprint,
  };
  index.scans = [entry, ...index.scans.filter((item) => item.id !== scan.id)]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 100);
  index.updatedAt = scan.updatedAt;
  await saveCoverageIndex(index);
}

export async function loadLatestScanForMyList(name: string): Promise<AudioReadinessScan | null> {
  const entry = (await listSavedScans()).find(
    (scan) => scan.targetType !== "billboard_hot100" && scan.myListName === name,
  );
  return entry ? loadAudioReadinessScan(entry.id) : null;
}

function winnerFingerprint(scan: AudioReadinessScan, targetRowKey: string): string | null {
  const result = scan.results.find((item) => item.target.targetRowKey === targetRowKey);
  const winner = result?.candidates.find((candidate) => candidate.filePath === result.winnerPath);
  return winner?.probe?.fingerprint ?? null;
}

export async function saveOperatorDecision(input: {
  scanId: string;
  targetRowKey: string;
  action: OperatorDecisionAction;
  note?: string | null;
  selectedPath?: string | null;
}): Promise<AudioReadinessScan> {
  const scan = await loadAudioReadinessScan(input.scanId);
  if (!scan) throw new Error("Scan not found");
  const index = scan.results.findIndex((result) => result.target.targetRowKey === input.targetRowKey);
  if (index < 0) throw new Error("Target row not found");
  const current = scan.results[index]!;
  const selectedPath =
    input.selectedPath && current.candidates.some((candidate) => candidate.filePath === input.selectedPath)
      ? input.selectedPath
      : current.winnerPath;
  const selected = current.candidates.find((candidate) => candidate.filePath === selectedPath);
  const event: OperatorDecisionEvent = {
    action: input.action,
    at: new Date().toISOString(),
    note: input.note?.trim() || null,
    selectedPath: selectedPath ?? null,
    automaticStatus: current.automaticStatus,
    requiresConfirmation: false,
    fileFingerprint: selected?.probe?.fingerprint ?? null,
  };
  scan.results[index] = classifyAudioReadiness({
    target: current.target,
    rvtr: current.rvtr,
    candidates: current.candidates,
    decisionHistory: [...current.decisionHistory, event],
  });
  await saveAudioReadinessScan(scan);
  return scan;
}

export function carryDecisionHistory(input: {
  previous: AudioReadinessScan | null;
  targetRowKey: string;
  nextWinnerFingerprint: string | null;
  nextInventoryFingerprint: string;
}): OperatorDecisionEvent[] {
  const previous = input.previous;
  if (!previous) return [];
  const prior = previous?.results.find((result) => result.target.targetRowKey === input.targetRowKey);
  if (!prior?.decisionHistory.length) return [];
  const previousFingerprint = winnerFingerprint(previous, input.targetRowKey);
  const requiresConfirmation =
    previousFingerprint !== input.nextWinnerFingerprint ||
    previous.inventory.fingerprint !== input.nextInventoryFingerprint;
  return prior.decisionHistory.map((event, index, history) =>
    index === history.length - 1 && event.action !== "clear_decision"
      ? { ...event, requiresConfirmation }
      : event,
  );
}
