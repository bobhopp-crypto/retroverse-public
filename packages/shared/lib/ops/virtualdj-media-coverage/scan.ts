import "server-only";

import { createHash } from "crypto";

import { classifyAudioReadiness } from "./audio/classify-readiness";
import { loadMyListTargets } from "./my-lists";
import { matchTargetAgainstInventory } from "./match";
import { loadStructuredRelationships, type StructuredTargetRelationship } from "./structured-relationships";
import {
  carryDecisionHistory,
  loadLatestScanForMyList,
  saveAudioReadinessScan,
  summarizeAudioReadiness,
} from "./store";
import type { AudioReadinessResult, AudioReadinessScan, CoverageTargetSong } from "./types";
import {
  artistTitleKey,
  buildVirtualDjLibraryIndex,
  type VirtualDjLibraryIndex,
} from "./vdj-index";

function scanId(name: string, inventoryFingerprint: string): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const suffix = createHash("sha256")
    .update(`${name}\0${inventoryFingerprint}\0${Date.now()}`)
    .digest("hex")
    .slice(0, 10);
  return `audio-${stamp}-${suffix}`;
}

async function mapWithConcurrency<T, U>(
  values: T[],
  concurrency: number,
  task: (value: T, index: number) => Promise<U>,
): Promise<U[]> {
  const out = new Array<U>(values.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < values.length) {
      const index = cursor++;
      out[index] = await task(values[index]!, index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, () => worker()));
  return out;
}

async function resolveTarget(
  target: CoverageTargetSong,
  index: VirtualDjLibraryIndex,
  previous: AudioReadinessScan | null,
  structured: StructuredTargetRelationship | null,
): Promise<AudioReadinessResult> {
  const matched = await matchTargetAgainstInventory(target, index, structured);
  const provisional = classifyAudioReadiness({
    target,
    rvtr: matched.rvtr,
    candidates: matched.candidates,
  });
  const winner = matched.candidates.find((candidate) => candidate.filePath === provisional.winnerPath);
  const decisionHistory = carryDecisionHistory({
    previous,
    targetRowKey: target.targetRowKey,
    nextWinnerFingerprint: winner?.probe?.fingerprint ?? null,
    nextInventoryFingerprint: index.summary.fingerprint,
  });
  return classifyAudioReadiness({
    target,
    rvtr: matched.rvtr,
    candidates: matched.candidates,
    decisionHistory,
  });
}

export async function runAudioReadinessScan(myListName: string): Promise<AudioReadinessScan> {
  const [inventory, myList] = await Promise.all([
    buildVirtualDjLibraryIndex(),
    loadMyListTargets(myListName),
  ]);
  const previous = await loadLatestScanForMyList(myList.name);
  const structured = await loadStructuredRelationships(myList.targets);
  const results = await mapWithConcurrency(myList.targets, 4, (target) =>
    resolveTarget(
      target,
      inventory,
      previous,
      structured.get(artistTitleKey(target.artist, target.title)) ?? null,
    ),
  );
  const now = new Date().toISOString();
  const scan: AudioReadinessScan = {
    version: 1,
    id: scanId(myList.name, inventory.summary.fingerprint),
    mode: "audio_readiness",
    myList: {
      name: myList.name,
      filename: myList.filename,
      path: myList.path,
      rowCount: myList.targets.length,
    },
    inventory: inventory.summary,
    createdAt: now,
    updatedAt: now,
    summary: {
      total: 0,
      ready: 0,
      review: 0,
      upgrade_recommended: 0,
      alternate_only: 0,
      missing: 0,
      skipped: 0,
      decisions: 0,
    },
    results,
  };
  scan.summary = summarizeAudioReadiness(scan);
  await saveAudioReadinessScan(scan);
  return scan;
}
