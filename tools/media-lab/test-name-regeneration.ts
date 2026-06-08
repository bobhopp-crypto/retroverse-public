/**
 * Verify multi-pass name regeneration yields unique candidates.
 * Usage: npx tsx tools/media-lab/test-name-regeneration.ts
 */
import assert from "node:assert/strict";

import type { TranscriptSegment } from "@/lib/ops/media-lab/build-chapters-from-segments";
import {
  collectNameCandidates,
  MIN_NAME_REGENERATIONS,
  normalizeNameKey,
  regenerateClipName,
} from "@/lib/ops/media-lab/editorial/name-regeneration";

const segments: TranscriptSegment[] = [
  { start: 0, end: 8, text: "Batman returns in a new adventure from DC Comics." },
  { start: 8, end: 20, text: "Springfield Urbana dealers have the best selection." },
  { start: 20, end: 35, text: "Don't miss Batman on Fox tonight." },
];

function main() {
  const baseInput = {
    startSec: 0,
    endSec: 12,
    title: "Batman",
    segments,
    ocr: { primarySubject: "Batman", subjects: ["Batman", "Fox"] },
    usedNames: new Set<string>(),
    regenPass: 0,
  };

  const candidates = collectNameCandidates(baseInput);
  assert.ok(candidates.length >= MIN_NAME_REGENERATIONS, `expected >= ${MIN_NAME_REGENERATIONS} candidates`);

  const seen = new Set<string>();
  const usedNames = new Set<string>([normalizeNameKey("Batman")]);
  const picks: string[] = [];

  for (let pass = 0; pass < MIN_NAME_REGENERATIONS; pass++) {
    const result = regenerateClipName({ ...baseInput, usedNames, regenPass: pass });
    assert.ok(result, `pass ${pass} should return a name`);
    picks.push(result!.name);
    usedNames.add(normalizeNameKey(result!.name));
    assert.ok(!seen.has(normalizeNameKey(result!.name)), `duplicate on pass ${pass}: ${result!.name}`);
    seen.add(normalizeNameKey(result!.name));
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        candidateCount: candidates.length,
        sampleCandidates: candidates.slice(0, 8).map((c) => ({ name: c.name, tier: c.tier, source: c.source })),
        fivePasses: picks,
      },
      null,
      2,
    ),
  );
}

main();
