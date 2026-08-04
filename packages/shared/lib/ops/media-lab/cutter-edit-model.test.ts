import assert from "node:assert/strict";
import test from "node:test";

import {
  applyExtractionTransaction,
  applyReturnToTimelineTransaction,
  applyUndoTransaction,
  calculateExtractedDurationSec,
  calculateWorkingDurationSec,
  createEmptyCutterManifest,
  createStableClipId,
  deriveRemainingRanges,
  generateDeterministicTitle,
  identifyNextRemainingRange,
  identifyRangeContainingSourceTime,
  migrateLegacyManualSegments,
  nextRemainingPlaybackRange,
  normalizeExtractedRanges,
  overlappingTranscriptSegments,
  rippleEditPoint,
  sampleWorkingTimelineSourceTimes,
  sourceTimeToWorkingPointerPosition,
  sourceTimeToWorkingTime,
  transcriptExcerpt,
  updateCutterClip,
  validateExtractionRange,
  workingPointerPositionToSourceTime,
  workingTimeToSourceTime,
  type CutterClip,
  type CutterManifest,
} from "./cutter-edit-model";

const NOW = "2026-07-30T12:00:00.000Z";
const FP = "fingerprint-001";

function clip(
  id: string,
  sourceInSec: number,
  sourceOutSec: number,
  sequence = 1,
): CutterClip {
  return {
    id,
    sequence,
    sourceInSec,
    sourceOutSec,
    durationSec: sourceOutSec - sourceInSec,
    title: id,
    titleSource: "operator",
    titleConfidence: "high",
    transcriptSegmentIds: [],
    transcriptExcerpt: "",
    transcriptCoverage: "none",
    notes: "",
    includeForExport: true,
    provenance: "manual",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function manifest(duration = 100): CutterManifest {
  return createEmptyCutterManifest({
    sourceFilename: "source.mp4",
    sourceFingerprint: FP,
    sourceDurationSec: duration,
    now: NOW,
  });
}

test("no extracted clips produce the full remaining source range", () => {
  assert.deepEqual(deriveRemainingRanges(100, []), [
    { sourceStartSec: 0, sourceEndSec: 100 },
  ]);
});

test("one extraction produces two ripple-closed remaining ranges", () => {
  assert.deepEqual(deriveRemainingRanges(100, [clip("one", 20, 30)]), [
    { sourceStartSec: 0, sourceEndSec: 20 },
    { sourceStartSec: 30, sourceEndSec: 100 },
  ]);
});

test("multiple and adjacent extractions normalize deterministically", () => {
  const normalized = normalizeExtractedRanges(
    [clip("b", 30, 40), clip("a", 10, 20), clip("touch", 20, 30)],
    100,
  );
  assert.deepEqual(normalized, [{ sourceStartSec: 10, sourceEndSec: 40 }]);
  assert.deepEqual(deriveRemainingRanges(100, normalized), [
    { sourceStartSec: 0, sourceEndSec: 10 },
    { sourceStartSec: 40, sourceEndSec: 100 },
  ]);
});

test("overlap, duplicate, zero, negative, NaN, Infinity, and overflow are blocked", () => {
  const existing = [clip("saved", 20, 30)];
  assert.match(validateExtractionRange(25, 35, 100, existing).errors.join(" "), /overlaps/);
  assert.match(validateExtractionRange(20, 30, 100, existing).errors.join(" "), /overlaps/);
  assert.match(validateExtractionRange(10, 10, 100, []).errors.join(" "), /after In/);
  assert.match(validateExtractionRange(10, 9, 100, []).errors.join(" "), /after In/);
  assert.match(validateExtractionRange(Number.NaN, 9, 100, []).errors.join(" "), /finite/);
  assert.match(
    validateExtractionRange(9, Number.POSITIVE_INFINITY, 100, []).errors.join(" "),
    /finite/,
  );
  assert.match(validateExtractionRange(-1, 1, 100, []).errors.join(" "), /source start/);
  assert.match(validateExtractionRange(99, 101, 100, []).errors.join(" "), /exceeds/);
  assert.equal(validateExtractionRange(10, 20, 100, existing).ok, true);
  assert.equal(validateExtractionRange(30, 40, 100, existing).ok, true);
});

test("source-start and source-end containment produce correct remaining ranges", () => {
  assert.deepEqual(deriveRemainingRanges(100, [clip("start", 0, 10)]), [
    { sourceStartSec: 10, sourceEndSec: 100 },
  ]);
  assert.deepEqual(deriveRemainingRanges(100, [clip("end", 90, 100)]), [
    { sourceStartSec: 0, sourceEndSec: 90 },
  ]);
});

test("working and extracted duration totals remain exact", () => {
  const clips = [clip("one", 10, 20), clip("two", 40, 55)];
  const remaining = deriveRemainingRanges(100, clips);
  assert.equal(calculateExtractedDurationSec(100, clips), 25);
  assert.equal(calculateWorkingDurationSec(remaining), 75);
});

test("Working-to-source mapping selects the next source range at virtual joins", () => {
  const remaining = deriveRemainingRanges(100, [
    clip("one", 20, 30),
    clip("two", 50, 70),
  ]);
  assert.equal(workingTimeToSourceTime(10, remaining), 10);
  assert.equal(workingTimeToSourceTime(20, remaining), 30);
  assert.equal(workingTimeToSourceTime(40, remaining), 70);
  assert.equal(workingTimeToSourceTime(70, remaining), 100);
});

test("source-to-Working mapping clamps extracted source positions to their joins", () => {
  const remaining = deriveRemainingRanges(100, [
    clip("one", 20, 30),
    clip("two", 50, 70),
  ]);
  assert.equal(sourceTimeToWorkingTime(15, remaining), 15);
  assert.equal(sourceTimeToWorkingTime(25, remaining), 20);
  assert.equal(sourceTimeToWorkingTime(35, remaining), 25);
  assert.equal(sourceTimeToWorkingTime(60, remaining), 40);
});

test("Working pointer and source percentage mappings use Working duration", () => {
  const remaining = deriveRemainingRanges(100, [clip("one", 20, 40)]);
  assert.equal(workingPointerPositionToSourceTime(0.25, remaining), 40);
  assert.equal(workingPointerPositionToSourceTime(0.5, remaining), 60);
  assert.equal(sourceTimeToWorkingPointerPosition(60, remaining), 0.5);
  assert.equal(sourceTimeToWorkingPointerPosition(30, remaining), 0.25);
});

test("range lookup, next range, and final playback stop are deterministic", () => {
  const remaining = deriveRemainingRanges(100, [clip("one", 20, 40)]);
  assert.deepEqual(identifyRangeContainingSourceTime(10, remaining), remaining[0]);
  assert.equal(identifyRangeContainingSourceTime(30, remaining), null);
  assert.deepEqual(identifyNextRemainingRange(20, remaining), remaining[1]);
  assert.deepEqual(nextRemainingPlaybackRange(30, remaining), remaining[1]);
  assert.equal(nextRemainingPlaybackRange(100.1, remaining), null);
});

test("ripple edit points work in the middle, at source start, and at source end", () => {
  assert.deepEqual(
    rippleEditPoint(20, deriveRemainingRanges(100, [clip("middle", 20, 30)])),
    { sourceTimeSec: 30, workingTimeSec: 20 },
  );
  assert.deepEqual(
    rippleEditPoint(0, deriveRemainingRanges(100, [clip("start", 0, 10)])),
    { sourceTimeSec: 10, workingTimeSec: 0 },
  );
  assert.deepEqual(
    rippleEditPoint(90, deriveRemainingRanges(100, [clip("end", 90, 100)])),
    { sourceTimeSec: 89.999, workingTimeSec: 90 },
  );
});

test("Working filmstrip source samples reflow without changing the source cache domain", () => {
  const full = sampleWorkingTimelineSourceTimes(deriveRemainingRanges(100, []), 5);
  const shortened = sampleWorkingTimelineSourceTimes(
    deriveRemainingRanges(100, [clip("one", 20, 80)]),
    5,
  );
  assert.deepEqual(full, [0, 25, 50, 75, 100]);
  assert.deepEqual(shortened, [0, 10, 80, 90, 100]);
});

test("I/O transaction creates stable chronological manual clips and is atomic on failure", () => {
  const base = manifest();
  const original = JSON.stringify(base);
  const first = applyExtractionTransaction(base, {
    sourceFingerprint: FP,
    sourceInSec: 40,
    sourceOutSec: 50,
    sourcePlayheadSec: 50,
    transcriptSegments: [],
    now: NOW,
  });
  assert.equal(first.affectedClip.provenance, "manual");
  assert.match(first.affectedClip.id, /^CLIP-/);
  assert.equal(first.affectedClip.sequence, 1);
  assert.equal(first.activeInSec, null);
  assert.equal(first.sourcePlayheadSec, 50);
  assert.equal(JSON.stringify(base), original);
  assert.throws(
    () =>
      applyExtractionTransaction(first.manifest, {
        sourceFingerprint: FP,
        sourceInSec: 45,
        sourceOutSec: 55,
        sourcePlayheadSec: 55,
        transcriptSegments: [],
        now: "2026-07-30T12:01:00.000Z",
      }),
    /overlaps/,
  );
  assert.equal(first.manifest.extractedClips.length, 1);
});

test("stable clip IDs do not depend on display sequence", () => {
  assert.equal(
    createStableClipId(FP, 10, 20, NOW),
    createStableClipId(FP, 10, 20, NOW),
  );
});

test("transcript overlap uses true interval overlap and excludes outside segments", () => {
  const segments = [
    { start: 0, end: 11, text: "partial opening" },
    { start: 11, end: 15, text: "inside" },
    { start: 20, end: 30, text: "outside" },
  ];
  const overlaps = overlappingTranscriptSegments(segments, 10, 20);
  assert.equal(overlaps.length, 2);
  assert.equal(overlaps[0].text, "partial opening");
  assert.equal(transcriptExcerpt(overlaps), "partial opening inside");
});

test("deterministic title rules, existing labels, and fallback are persisted", () => {
  assert.deepEqual(
    generateDeterministicTitle(
      [{ start: 0, end: 2, text: "Please welcome Richie Havens to the stage." }],
      1,
    ),
    {
      title: "Richie Havens",
      titleSource: "transcript_rule",
      titleConfidence: "medium",
    },
  );
  assert.deepEqual(
    generateDeterministicTitle([], 2, [
      { startSec: 10, endSec: 20, title: "Existing Chapter Hint" },
    ], 12, 14),
    {
      title: "Existing Chapter Hint",
      titleSource: "existing_label",
      titleConfidence: "low",
    },
  );
  assert.equal(generateDeterministicTitle([], 3).title, "Clip 003");
});

test("operator title edits are protected and Include for Export persists", () => {
  const extracted = applyExtractionTransaction(manifest(), {
    sourceFingerprint: FP,
    sourceInSec: 10,
    sourceOutSec: 20,
    sourcePlayheadSec: 20,
    transcriptSegments: [],
    now: NOW,
  }).manifest;
  const renamed = updateCutterClip(extracted, {
    sourceFingerprint: FP,
    clipId: extracted.extractedClips[0].id,
    title: "Richie Havens — Freedom",
    includeForExport: false,
    now: "2026-07-30T12:02:00.000Z",
  });
  assert.equal(renamed.extractedClips[0].title, "Richie Havens — Freedom");
  assert.equal(renamed.extractedClips[0].titleSource, "operator");
  assert.equal(renamed.extractedClips[0].includeForExport, false);
});

test("Return to Timeline restores footage chronologically and preserves unrelated clips", () => {
  const first = applyExtractionTransaction(manifest(), {
    sourceFingerprint: FP,
    sourceInSec: 40,
    sourceOutSec: 50,
    sourcePlayheadSec: 50,
    transcriptSegments: [],
    now: NOW,
  });
  const second = applyExtractionTransaction(first.manifest, {
    sourceFingerprint: FP,
    sourceInSec: 10,
    sourceOutSec: 20,
    sourcePlayheadSec: 20,
    transcriptSegments: [],
    now: "2026-07-30T12:01:00.000Z",
  });
  assert.deepEqual(second.manifest.extractedClips.map((item) => item.sequence), [1, 2]);
  assert.deepEqual(second.manifest.extractedClips.map((item) => item.sourceInSec), [10, 40]);
  const returned = applyReturnToTimelineTransaction(second.manifest, {
    sourceFingerprint: FP,
    clipId: second.manifest.extractedClips[0].id,
    sourcePlayheadSec: 20,
    activeInSec: null,
    now: "2026-07-30T12:02:00.000Z",
  });
  assert.deepEqual(returned.manifest.extractedClips.map((item) => item.sourceInSec), [40]);
  assert.deepEqual(deriveRemainingRanges(100, returned.manifest.extractedClips), [
    { sourceStartSec: 0, sourceEndSec: 40 },
    { sourceStartSec: 50, sourceEndSec: 100 },
  ]);
});

test("undo extraction and undo return restore exact clip identity and metadata", () => {
  const extracted = applyExtractionTransaction(manifest(), {
    sourceFingerprint: FP,
    sourceInSec: 10,
    sourceOutSec: 20,
    sourcePlayheadSec: 20,
    transcriptSegments: [{ start: 9, end: 21, text: "Please welcome Richie Havens." }],
    now: NOW,
  });
  const undoneExtract = applyUndoTransaction(extracted.manifest, {
    sourceFingerprint: FP,
    now: "2026-07-30T12:01:00.000Z",
  });
  assert.equal(undoneExtract.manifest.extractedClips.length, 0);
  assert.equal(undoneExtract.activeInSec, 10);

  const returned = applyReturnToTimelineTransaction(extracted.manifest, {
    sourceFingerprint: FP,
    clipId: extracted.affectedClip.id,
    sourcePlayheadSec: 20,
    activeInSec: null,
    now: "2026-07-30T12:02:00.000Z",
  });
  const undoneReturn = applyUndoTransaction(returned.manifest, {
    sourceFingerprint: FP,
    now: "2026-07-30T12:03:00.000Z",
  });
  assert.deepEqual(undoneReturn.manifest.extractedClips[0], extracted.affectedClip);
});

test("source fingerprint mismatch blocks every mutation", () => {
  const base = manifest();
  assert.throws(
    () =>
      applyExtractionTransaction(base, {
        sourceFingerprint: "other",
        sourceInSec: 1,
        sourceOutSec: 2,
        sourcePlayheadSec: 2,
        transcriptSegments: [],
        now: NOW,
      }),
    /fingerprint/,
  );
  assert.throws(
    () =>
      updateCutterClip(base, {
        sourceFingerprint: "other",
        clipId: "missing",
        title: "No",
        now: NOW,
      }),
    /fingerprint/,
  );
});

test("valid manual legacy clips migrate while generated and mismatched records cannot", () => {
  const migrated = migrateLegacyManualSegments(
    [
      {
        id: "manual-original",
        sourceFilename: "source.mp4",
        sourceFingerprint: FP,
        startSeconds: 10,
        endSeconds: 20,
        title: "Operator title",
        notes: "keep",
        includeForExport: false,
        transcriptExcerpt: "persisted excerpt",
        createdAt: NOW,
      },
      {
        id: "chapter-generated",
        provenance: "generated",
        sourceFilename: "source.mp4",
        sourceFingerprint: FP,
        startSeconds: 20,
        endSeconds: 30,
        title: "Generated chapter",
      },
      {
        id: "manual-wrong-source",
        sourceFilename: "source.mp4",
        sourceFingerprint: "other",
        startSeconds: 30,
        endSeconds: 40,
        title: "Wrong source",
      },
    ],
    {
      sourceFilename: "source.mp4",
      sourceFingerprint: FP,
      sourceDurationSec: 100,
      now: NOW,
    },
  );
  assert.equal(migrated.migratedCount, 1);
  assert.equal(migrated.skippedCount, 2);
  assert.equal(migrated.manifest.extractedClips[0].id, "manual-original");
  assert.equal(migrated.manifest.extractedClips[0].title, "Operator title");
  assert.equal(migrated.manifest.extractedClips[0].notes, "keep");
  assert.equal(migrated.manifest.extractedClips[0].includeForExport, false);
  assert.equal(migrated.manifest.extractedClips[0].transcriptExcerpt, "persisted excerpt");
});
