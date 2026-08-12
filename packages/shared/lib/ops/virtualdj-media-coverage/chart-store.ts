import "server-only";

import { createHash } from "crypto";
import { readFile } from "fs/promises";

import { classifyChartAudio, summarizeChartCoverage } from "./chart-classification";
import { writeJsonAtomic } from "./atomic-json";
import { scanPath } from "./paths";
import {
  loadCoverageIndex,
  saveCoverageIndex,
} from "./store";
import type {
  CandidateEvidence,
  ChartCoverageResult,
  ChartCoverageScan,
  CoverageDecisionAction,
  CoverageDecisionAxis,
  CoverageDecisionEvent,
  CoverageScanIndexEntry,
} from "./types";
import { classifyVideoCoverage } from "./video/classify-coverage";

function isChartCoverageScan(value: unknown): value is ChartCoverageScan {
  if (!value || typeof value !== "object") return false;
  const scan = value as Partial<ChartCoverageScan>;
  return (
    scan.version === 2 &&
    scan.productVersion === "billboard_media_coverage_v1" &&
    scan.mode === "billboard_media_coverage" &&
    scan.targetType === "billboard_hot100" &&
    Boolean(scan.selection?.selectionKey) &&
    Boolean(scan.inventory?.fingerprint) &&
    Array.isArray(scan.results)
  );
}

export async function loadChartCoverageScan(scanId: string): Promise<ChartCoverageScan | null> {
  try {
    const parsed = JSON.parse(await readFile(scanPath(scanId), "utf8")) as unknown;
    return isChartCoverageScan(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function listSavedChartScans(): Promise<CoverageScanIndexEntry[]> {
  return (await loadCoverageIndex()).scans.filter(
    (scan) => scan.targetType === "billboard_hot100",
  );
}

export async function loadLatestChartScan(
  selectionKey: string,
): Promise<ChartCoverageScan | null> {
  const entry = (await listSavedChartScans()).find(
    (scan) => scan.selectionKey === selectionKey,
  );
  return entry ? loadChartCoverageScan(entry.id) : null;
}

export async function saveChartCoverageScan(scan: ChartCoverageScan): Promise<void> {
  scan.summary = summarizeChartCoverage(scan.results);
  scan.updatedAt = new Date().toISOString();
  await writeJsonAtomic(scanPath(scan.id), scan);
  const index = await loadCoverageIndex();
  const entry: CoverageScanIndexEntry = {
    id: scan.id,
    targetType: "billboard_hot100",
    label: scan.selection.label,
    selectionKey: scan.selection.selectionKey,
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

export function decisionEvidenceFingerprint(
  inventoryFingerprint: string,
  candidate: CandidateEvidence | null,
): string | null {
  if (!candidate) return null;
  return createHash("sha256")
    .update(
      `${inventoryFingerprint}\0${candidate.filePath}\0${candidate.probe?.fingerprint ?? candidate.fileExists ?? "unknown"}`,
    )
    .digest("hex");
}

export function carryChartDecisionHistory(input: {
  previous: ChartCoverageScan | null;
  targetRowKey: string;
  axis: CoverageDecisionAxis;
  candidates: CandidateEvidence[];
  automaticWinnerPath: string | null;
  inventoryFingerprint: string;
}): CoverageDecisionEvent[] {
  if (!input.previous) return [];
  const prior = input.previous.results.find(
    (result) => result.target.targetRowKey === input.targetRowKey,
  );
  const history = prior?.[input.axis].decisionHistory ?? [];
  if (history.length === 0) return [];
  const latest = history.at(-1)!;
  if (latest.action === "clear_decision") return [...history];
  const path = latest.selectedPath ?? input.automaticWinnerPath;
  const candidate = input.candidates.find((item) => item.filePath === path) ?? null;
  const nextFingerprint = decisionEvidenceFingerprint(input.inventoryFingerprint, candidate);
  const requiresConfirmation =
    candidate == null ||
    latest.evidenceFingerprint == null ||
    latest.evidenceFingerprint !== nextFingerprint;
  return history.map((event, index) =>
    index === history.length - 1 ? { ...event, requiresConfirmation } : event,
  );
}

function selectedCandidate(
  result: ChartCoverageResult,
  axis: CoverageDecisionAxis,
  requestedPath: string | null | undefined,
): CandidateEvidence | null {
  const managedClass = axis === "audio" ? "managed_audio" : "managed_video";
  const candidates = result.candidates.filter(
    (candidate) => candidate.managedClass === managedClass,
  );
  const requested = requestedPath
    ? candidates.find((candidate) => candidate.filePath === requestedPath)
    : null;
  if (requested) return requested;
  const winnerPath = result[axis].winnerPath;
  return candidates.find((candidate) => candidate.filePath === winnerPath) ?? null;
}

export async function saveChartCoverageDecision(input: {
  scanId: string;
  targetRowKey: string;
  axis: CoverageDecisionAxis;
  action: CoverageDecisionAction;
  note?: string | null;
  selectedPath?: string | null;
}): Promise<ChartCoverageScan> {
  if (input.axis === "video" && input.action === "mark_upgrade_recommended") {
    throw new Error("Upgrade recommendation is an audio-only decision");
  }
  const scan = await loadChartCoverageScan(input.scanId);
  if (!scan) throw new Error("Chart coverage scan not found");
  const resultIndex = scan.results.findIndex(
    (result) => result.target.targetRowKey === input.targetRowKey,
  );
  if (resultIndex < 0) throw new Error("Chart target not found");
  const result = scan.results[resultIndex]!;
  const selected = selectedCandidate(result, input.axis, input.selectedPath);
  const previousHistory = result[input.axis].decisionHistory;
  const event: CoverageDecisionEvent = {
    axis: input.axis,
    action: input.action,
    at: new Date().toISOString(),
    note: input.note?.trim() || null,
    selectedPath: selected?.filePath ?? null,
    automaticStatus: result[input.axis].automaticStatus,
    requiresConfirmation: false,
    evidenceFingerprint: decisionEvidenceFingerprint(scan.inventory.fingerprint, selected),
  };
  const decisionHistory = [...previousHistory, event];

  if (input.axis === "audio") {
    result.audio = classifyChartAudio({
      target: result.target,
      rvtr: result.rvtr,
      candidates: result.candidates,
      decisionHistory,
    });
  } else {
    result.video = classifyVideoCoverage({
      target: result.target,
      candidates: result.candidates,
      decisionHistory,
    });
  }
  scan.results[resultIndex] = result;
  await saveChartCoverageScan(scan);
  return scan;
}
