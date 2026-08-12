export const CUTTER_MANIFEST_VERSION = 1 as const;
export const CUTTER_MIN_CLIP_DURATION_SEC = 0.1;
export const CUTTER_TIME_TOLERANCE_SEC = 0.000_5;
export const CUTTER_UNDO_LIMIT = 50;

export type CutterPlaybackMode = "working" | "source_navigation" | "clip_preview";
export type CutterTitleSource =
  | "transcript_rule"
  | "existing_label"
  | "fallback"
  | "operator";
export type CutterTitleConfidence = "high" | "medium" | "low";
export type CutterTranscriptCoverage = "full" | "partial" | "none";

export type SourceRange = {
  sourceStartSec: number;
  sourceEndSec: number;
};

export type CutterTranscriptSegment = {
  id?: string;
  start: number;
  end: number;
  text: string;
};

export type CutterExistingLabel = {
  startSec: number;
  endSec: number;
  title: string;
};

export type CutterClip = {
  id: string;
  sequence: number;
  sourceInSec: number;
  sourceOutSec: number;
  durationSec: number;
  title: string;
  titleSource: CutterTitleSource;
  titleConfidence: CutterTitleConfidence;
  transcriptSegmentIds: string[];
  transcriptExcerpt: string;
  transcriptCoverage: CutterTranscriptCoverage;
  notes: string;
  includeForExport: boolean;
  provenance: "manual";
  createdAt: string;
  updatedAt: string;
};

export type CutterEditHistoryEntry = {
  id: string;
  action: "extract" | "return";
  clip: CutterClip;
  sourcePlayheadSec: number;
  activeInSec: number | null;
  createdAt: string;
};

export type CutterManifest = {
  version: typeof CUTTER_MANIFEST_VERSION;
  sourceFilename: string;
  sourceFingerprint: string;
  sourceDurationSec: number;
  extractedClips: CutterClip[];
  editHistory: CutterEditHistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

export type CutterTransactionResult = {
  manifest: CutterManifest;
  affectedClip: CutterClip;
  sourcePlayheadSec: number;
  workingTimeSec: number;
  activeInSec: number | null;
};

export type CutterValidationResult = {
  ok: boolean;
  errors: string[];
  conflictingClip?: CutterClip;
};

export type LegacyManualSegment = {
  id?: string;
  sourceFilename?: string;
  sourceFingerprint?: string;
  startSeconds?: number;
  endSeconds?: number;
  durationSeconds?: number;
  title?: string;
  notes?: string;
  includeForExport?: boolean;
  transcriptSegmentIds?: string[];
  transcriptExcerpt?: string;
  provenance?: string;
  createdAt?: string;
  modifiedAt?: string;
};

function finite(value: number): boolean {
  return Number.isFinite(value);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundTime(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function rangeFrom(value: SourceRange | CutterClip): SourceRange {
  if ("sourceInSec" in value) {
    return {
      sourceStartSec: value.sourceInSec,
      sourceEndSec: value.sourceOutSec,
    };
  }
  return value;
}

export function normalizeExtractedRanges(
  extracted: Array<SourceRange | CutterClip>,
  sourceDurationSec: number,
  toleranceSec = CUTTER_TIME_TOLERANCE_SEC,
): SourceRange[] {
  if (!finite(sourceDurationSec) || sourceDurationSec <= 0) return [];
  const ranges = extracted
    .map(rangeFrom)
    .filter(
      (range) =>
        finite(range.sourceStartSec) &&
        finite(range.sourceEndSec) &&
        range.sourceEndSec > range.sourceStartSec,
    )
    .map((range) => ({
      sourceStartSec: roundTime(clamp(range.sourceStartSec, 0, sourceDurationSec)),
      sourceEndSec: roundTime(clamp(range.sourceEndSec, 0, sourceDurationSec)),
    }))
    .filter((range) => range.sourceEndSec > range.sourceStartSec)
    .sort(
      (left, right) =>
        left.sourceStartSec - right.sourceStartSec ||
        left.sourceEndSec - right.sourceEndSec,
    );

  const normalized: SourceRange[] = [];
  for (const range of ranges) {
    const previous = normalized.at(-1);
    if (!previous || range.sourceStartSec > previous.sourceEndSec + toleranceSec) {
      normalized.push({ ...range });
      continue;
    }
    previous.sourceEndSec = Math.max(previous.sourceEndSec, range.sourceEndSec);
  }
  return normalized;
}

export function deriveRemainingRanges(
  sourceDurationSec: number,
  extracted: Array<SourceRange | CutterClip>,
): SourceRange[] {
  if (!finite(sourceDurationSec) || sourceDurationSec <= 0) return [];
  const normalized = normalizeExtractedRanges(extracted, sourceDurationSec);
  const remaining: SourceRange[] = [];
  let cursor = 0;
  for (const range of normalized) {
    if (range.sourceStartSec > cursor + CUTTER_TIME_TOLERANCE_SEC) {
      remaining.push({
        sourceStartSec: roundTime(cursor),
        sourceEndSec: roundTime(range.sourceStartSec),
      });
    }
    cursor = Math.max(cursor, range.sourceEndSec);
  }
  if (cursor < sourceDurationSec - CUTTER_TIME_TOLERANCE_SEC) {
    remaining.push({
      sourceStartSec: roundTime(cursor),
      sourceEndSec: roundTime(sourceDurationSec),
    });
  }
  return remaining;
}

export function rangeDurationSec(range: SourceRange): number {
  return Math.max(0, range.sourceEndSec - range.sourceStartSec);
}

export function calculateWorkingDurationSec(remainingRanges: SourceRange[]): number {
  return roundTime(remainingRanges.reduce((total, range) => total + rangeDurationSec(range), 0));
}

export function calculateExtractedDurationSec(
  sourceDurationSec: number,
  extracted: Array<SourceRange | CutterClip>,
): number {
  return roundTime(
    normalizeExtractedRanges(extracted, sourceDurationSec).reduce(
      (total, range) => total + rangeDurationSec(range),
      0,
    ),
  );
}

export function identifyRangeContainingSourceTime(
  sourceTimeSec: number,
  remainingRanges: SourceRange[],
): SourceRange | null {
  if (!finite(sourceTimeSec)) return null;
  for (let index = 0; index < remainingRanges.length; index += 1) {
    const range = remainingRanges[index];
    const isFinal = index === remainingRanges.length - 1;
    if (
      sourceTimeSec >= range.sourceStartSec - CUTTER_TIME_TOLERANCE_SEC &&
      (sourceTimeSec < range.sourceEndSec - CUTTER_TIME_TOLERANCE_SEC ||
        (isFinal && sourceTimeSec <= range.sourceEndSec + CUTTER_TIME_TOLERANCE_SEC))
    ) {
      return range;
    }
  }
  return null;
}

export function identifyNextRemainingRange(
  sourceTimeSec: number,
  remainingRanges: SourceRange[],
): SourceRange | null {
  return (
    remainingRanges.find(
      (range) => range.sourceStartSec > sourceTimeSec + CUTTER_TIME_TOLERANCE_SEC,
    ) ?? null
  );
}

export function workingTimeToSourceTime(
  workingTimeSec: number,
  remainingRanges: SourceRange[],
): number {
  if (remainingRanges.length === 0 || !finite(workingTimeSec)) return 0;
  const workingDurationSec = calculateWorkingDurationSec(remainingRanges);
  const bounded = clamp(workingTimeSec, 0, workingDurationSec);
  let cursor = 0;
  for (let index = 0; index < remainingRanges.length; index += 1) {
    const range = remainingRanges[index];
    const duration = rangeDurationSec(range);
    const rangeWorkingEnd = cursor + duration;
    if (bounded < rangeWorkingEnd - CUTTER_TIME_TOLERANCE_SEC) {
      return roundTime(range.sourceStartSec + (bounded - cursor));
    }
    if (Math.abs(bounded - rangeWorkingEnd) <= CUTTER_TIME_TOLERANCE_SEC) {
      return roundTime(
        remainingRanges[index + 1]?.sourceStartSec ?? range.sourceEndSec,
      );
    }
    cursor = rangeWorkingEnd;
  }
  return roundTime(remainingRanges.at(-1)?.sourceEndSec ?? 0);
}

export function sourceTimeToWorkingTime(
  sourceTimeSec: number,
  remainingRanges: SourceRange[],
): number {
  if (remainingRanges.length === 0 || !finite(sourceTimeSec)) return 0;
  let workingCursor = 0;
  for (const range of remainingRanges) {
    if (sourceTimeSec < range.sourceStartSec) return roundTime(workingCursor);
    if (sourceTimeSec <= range.sourceEndSec) {
      return roundTime(
        workingCursor +
          clamp(sourceTimeSec - range.sourceStartSec, 0, rangeDurationSec(range)),
      );
    }
    workingCursor += rangeDurationSec(range);
  }
  return roundTime(workingCursor);
}

export function workingPointerPositionToSourceTime(
  pointerPosition: number,
  remainingRanges: SourceRange[],
): number {
  const workingDurationSec = calculateWorkingDurationSec(remainingRanges);
  return workingTimeToSourceTime(
    clamp(finite(pointerPosition) ? pointerPosition : 0, 0, 1) * workingDurationSec,
    remainingRanges,
  );
}

export function sourceTimeToWorkingPointerPosition(
  sourceTimeSec: number,
  remainingRanges: SourceRange[],
): number {
  const workingDurationSec = calculateWorkingDurationSec(remainingRanges);
  if (workingDurationSec <= 0) return 0;
  return clamp(sourceTimeToWorkingTime(sourceTimeSec, remainingRanges) / workingDurationSec, 0, 1);
}

export function sampleWorkingTimelineSourceTimes(
  remainingRanges: SourceRange[],
  requestedCount: number,
  maximumCount = 48,
): number[] {
  const workingDurationSec = calculateWorkingDurationSec(remainingRanges);
  if (workingDurationSec <= 0) return [];
  const count = Math.max(2, Math.min(maximumCount, Math.round(requestedCount)));
  return Array.from({ length: count }, (_, index) =>
    workingTimeToSourceTime(
      count === 1 ? 0 : (workingDurationSec * index) / (count - 1),
      remainingRanges,
    ),
  );
}

export function rippleEditPoint(
  sourceInSec: number,
  remainingRanges: SourceRange[],
): { sourceTimeSec: number; workingTimeSec: number } {
  if (remainingRanges.length === 0) return { sourceTimeSec: 0, workingTimeSec: 0 };
  const next =
    remainingRanges.find(
      (range) => range.sourceStartSec >= sourceInSec - CUTTER_TIME_TOLERANCE_SEC,
    ) ?? null;
  const finalRange = remainingRanges.at(-1)!;
  const sourceTimeSec = next
    ? next.sourceStartSec
    : Math.max(finalRange.sourceStartSec, finalRange.sourceEndSec - 0.001);
  return {
    sourceTimeSec: roundTime(sourceTimeSec),
    workingTimeSec: sourceTimeToWorkingTime(sourceInSec, remainingRanges),
  };
}

export function nextRemainingPlaybackRange(
  sourceTimeSec: number,
  remainingRanges: SourceRange[],
): SourceRange | null {
  return (
    identifyRangeContainingSourceTime(sourceTimeSec, remainingRanges) ??
    remainingRanges.find(
      (range) => range.sourceStartSec >= sourceTimeSec - CUTTER_TIME_TOLERANCE_SEC,
    ) ??
    null
  );
}

export function validateExtractionRange(
  sourceInSec: number,
  sourceOutSec: number,
  sourceDurationSec: number,
  clips: CutterClip[],
  minimumDurationSec = CUTTER_MIN_CLIP_DURATION_SEC,
): CutterValidationResult {
  const errors: string[] = [];
  if (!finite(sourceInSec)) errors.push("In must be finite.");
  if (!finite(sourceOutSec)) errors.push("Out must be finite.");
  if (!finite(sourceDurationSec) || sourceDurationSec <= 0) {
    errors.push("Source duration must be finite and positive.");
  }
  if (finite(sourceInSec) && sourceInSec < 0) errors.push("In is before source start.");
  if (finite(sourceOutSec) && sourceOutSec > sourceDurationSec) {
    errors.push("Out exceeds source duration.");
  }
  if (finite(sourceInSec) && finite(sourceOutSec) && sourceOutSec <= sourceInSec) {
    errors.push("Out must be after In.");
  }
  if (
    finite(sourceInSec) &&
    finite(sourceOutSec) &&
    sourceOutSec - sourceInSec < minimumDurationSec - CUTTER_TIME_TOLERANCE_SEC
  ) {
    errors.push(`Clip must be at least ${minimumDurationSec.toFixed(1)} seconds.`);
  }

  const conflictingClip =
    errors.length === 0
      ? clips.find(
          (clip) =>
            sourceInSec < clip.sourceOutSec - CUTTER_TIME_TOLERANCE_SEC &&
            sourceOutSec > clip.sourceInSec + CUTTER_TIME_TOLERANCE_SEC,
        )
      : undefined;
  if (conflictingClip) {
    errors.push(`Range overlaps ${conflictingClip.title} (${conflictingClip.id}).`);
  }
  return { ok: errors.length === 0, errors, conflictingClip };
}

export function transcriptSegmentId(
  segment: CutterTranscriptSegment,
  index: number,
): string {
  return segment.id?.trim() || `TRANSCRIPT-${String(index + 1).padStart(4, "0")}`;
}

export function overlappingTranscriptSegments(
  transcriptSegments: CutterTranscriptSegment[],
  sourceInSec: number,
  sourceOutSec: number,
): Array<CutterTranscriptSegment & { stableId: string }> {
  return transcriptSegments.flatMap((segment, index) =>
    segment.end > sourceInSec && segment.start < sourceOutSec
      ? [{ ...segment, stableId: transcriptSegmentId(segment, index) }]
      : [],
  );
}

export function transcriptExcerpt(
  segments: CutterTranscriptSegment[],
  maximumLength = 360,
): string {
  const text = segments
    .map((segment) => segment.text.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ")
    .trim();
  if (text.length <= maximumLength) return text;
  return `${text.slice(0, Math.max(0, maximumLength - 1)).trimEnd()}…`;
}

export function transcriptCoverage(
  segments: CutterTranscriptSegment[],
  sourceInSec: number,
  sourceOutSec: number,
): CutterTranscriptCoverage {
  if (segments.length === 0) return "none";
  const firstStart = Math.min(...segments.map((segment) => segment.start));
  const lastEnd = Math.max(...segments.map((segment) => segment.end));
  return firstStart <= sourceInSec && lastEnd >= sourceOutSec ? "full" : "partial";
}

function cleanTitleText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[\s,.;:!?-]+|[\s,.;:!?-]+$/g, "")
    .trim();
}

function concisePhrase(value: string, maximumWords = 9): string {
  const clause = cleanTitleText(value.split(/[.!?]|\s[-—]\s/)[0] ?? "");
  if (!clause) return "";
  const words = clause.split(/\s+/).slice(0, maximumWords);
  const phrase = words.join(" ");
  return words.length < clause.split(/\s+/).length ? `${phrase}…` : phrase;
}

function inferFallbackKind(text: string): "Performance" | "Announcement" | "Interview" | "Clip" {
  if (/\b(song|music|perform|stage|band|guitar|singer|concert)\b/i.test(text)) {
    return "Performance";
  }
  if (/\b(announce|announcement|attention|please|gate|road|traffic|festival)\b/i.test(text)) {
    return "Announcement";
  }
  if (/\b(interview|tell me|what do you|how do you|question)\b/i.test(text)) {
    return "Interview";
  }
  return "Clip";
}

export function generateDeterministicTitle(
  transcriptSegments: CutterTranscriptSegment[],
  sequence: number,
  existingLabels: CutterExistingLabel[] = [],
  sourceInSec = 0,
  sourceOutSec = 0,
): {
  title: string;
  titleSource: CutterTitleSource;
  titleConfidence: CutterTitleConfidence;
} {
  const joined = cleanTitleText(transcriptSegments.map((segment) => segment.text).join(" "));
  if (joined) {
    const introduction = joined.match(
      /\b(?:welcome|presenting|introduce|give it up for|hear(?:\s+stars)?(?:\s+such as)?|here(?:'s| is)|this is)\s+([A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){0,3})/,
    );
    const song = joined.match(/\b(?:called|song(?:\s+is)?|play)\s+["“]?([^.!?,"”]{2,50})/i);
    const artist = cleanTitleText(introduction?.[1] ?? "");
    const songTitle = concisePhrase(song?.[1] ?? "", 6);
    if (artist && songTitle) {
      return {
        title: `${artist} — ${songTitle}`,
        titleSource: "transcript_rule",
        titleConfidence: "high",
      };
    }
    if (artist) {
      return {
        title: artist,
        titleSource: "transcript_rule",
        titleConfidence: "medium",
      };
    }
    const phrase = concisePhrase(transcriptSegments[0]?.text ?? joined);
    if (phrase) {
      return {
        title: phrase,
        titleSource: "transcript_rule",
        titleConfidence: "medium",
      };
    }
  }

  const label = existingLabels.find(
    (candidate) =>
      candidate.endSec > sourceInSec &&
      candidate.startSec < sourceOutSec &&
      cleanTitleText(candidate.title) !== "",
  );
  if (label) {
    return {
      title: cleanTitleText(label.title),
      titleSource: "existing_label",
      titleConfidence: "low",
    };
  }

  const fallback = inferFallbackKind(joined);
  return {
    title: `${fallback} ${String(Math.max(1, sequence)).padStart(3, "0")}`,
    titleSource: "fallback",
    titleConfidence: "low",
  };
}

export function createStableClipId(
  sourceFingerprint: string,
  sourceInSec: number,
  sourceOutSec: number,
  createdAt: string,
): string {
  const stamp = Date.parse(createdAt);
  const createdPart = Number.isFinite(stamp) ? stamp.toString(36) : "time";
  return [
    "CLIP",
    sourceFingerprint.replace(/[^a-z0-9]/gi, "").slice(0, 10).toUpperCase() || "SOURCE",
    Math.round(sourceInSec * 1000).toString(36).toUpperCase(),
    Math.round(sourceOutSec * 1000).toString(36).toUpperCase(),
    createdPart.toUpperCase(),
  ].join("-");
}

function withChronologicalSequences(clips: CutterClip[]): CutterClip[] {
  return [...clips]
    .sort(
      (left, right) =>
        left.sourceInSec - right.sourceInSec ||
        left.sourceOutSec - right.sourceOutSec ||
        left.id.localeCompare(right.id),
    )
    .map((clip, index) => ({ ...clip, sequence: index + 1 }));
}

function pushHistory(
  history: CutterEditHistoryEntry[],
  entry: CutterEditHistoryEntry,
): CutterEditHistoryEntry[] {
  return [...history, entry].slice(-CUTTER_UNDO_LIMIT);
}

function assertFingerprint(manifest: CutterManifest, sourceFingerprint: string): void {
  if (!sourceFingerprint || manifest.sourceFingerprint !== sourceFingerprint) {
    throw new Error("Source fingerprint mismatch; edit blocked.");
  }
}

export function createEmptyCutterManifest(options: {
  sourceFilename: string;
  sourceFingerprint: string;
  sourceDurationSec: number;
  now: string;
}): CutterManifest {
  return {
    version: CUTTER_MANIFEST_VERSION,
    sourceFilename: options.sourceFilename,
    sourceFingerprint: options.sourceFingerprint,
    sourceDurationSec: options.sourceDurationSec,
    extractedClips: [],
    editHistory: [],
    createdAt: options.now,
    updatedAt: options.now,
  };
}

export function applyExtractionTransaction(
  manifest: CutterManifest,
  options: {
    sourceFingerprint: string;
    sourceInSec: number;
    sourceOutSec: number;
    sourcePlayheadSec: number;
    transcriptSegments: CutterTranscriptSegment[];
    existingLabels?: CutterExistingLabel[];
    now: string;
  },
): CutterTransactionResult {
  assertFingerprint(manifest, options.sourceFingerprint);
  const validation = validateExtractionRange(
    options.sourceInSec,
    options.sourceOutSec,
    manifest.sourceDurationSec,
    manifest.extractedClips,
  );
  if (!validation.ok) throw new Error(validation.errors.join(" "));

  const overlaps = overlappingTranscriptSegments(
    options.transcriptSegments,
    options.sourceInSec,
    options.sourceOutSec,
  );
  const sequence = manifest.extractedClips.length + 1;
  const named = generateDeterministicTitle(
    overlaps,
    sequence,
    options.existingLabels,
    options.sourceInSec,
    options.sourceOutSec,
  );
  const clip: CutterClip = {
    id: createStableClipId(
      manifest.sourceFingerprint,
      options.sourceInSec,
      options.sourceOutSec,
      options.now,
    ),
    sequence,
    sourceInSec: roundTime(options.sourceInSec),
    sourceOutSec: roundTime(options.sourceOutSec),
    durationSec: roundTime(options.sourceOutSec - options.sourceInSec),
    ...named,
    transcriptSegmentIds: overlaps.map((segment) => segment.stableId),
    transcriptExcerpt: transcriptExcerpt(overlaps),
    transcriptCoverage: transcriptCoverage(
      overlaps,
      options.sourceInSec,
      options.sourceOutSec,
    ),
    notes: "",
    includeForExport: true,
    provenance: "manual",
    createdAt: options.now,
    updatedAt: options.now,
  };
  const clips = withChronologicalSequences([...manifest.extractedClips, clip]);
  const historyEntry: CutterEditHistoryEntry = {
    id: `EDIT-${clip.id}`,
    action: "extract",
    clip,
    sourcePlayheadSec: options.sourcePlayheadSec,
    activeInSec: options.sourceInSec,
    createdAt: options.now,
  };
  const nextManifest: CutterManifest = {
    ...manifest,
    extractedClips: clips,
    editHistory: pushHistory(manifest.editHistory, historyEntry),
    updatedAt: options.now,
  };
  const remainingRanges = deriveRemainingRanges(
    manifest.sourceDurationSec,
    nextManifest.extractedClips,
  );
  const editPoint = rippleEditPoint(options.sourceInSec, remainingRanges);
  return {
    manifest: nextManifest,
    affectedClip: nextManifest.extractedClips.find((item) => item.id === clip.id)!,
    sourcePlayheadSec: editPoint.sourceTimeSec,
    workingTimeSec: editPoint.workingTimeSec,
    activeInSec: null,
  };
}

export function applyReturnToTimelineTransaction(
  manifest: CutterManifest,
  options: {
    sourceFingerprint: string;
    clipId: string;
    sourcePlayheadSec: number;
    activeInSec: number | null;
    now: string;
  },
): CutterTransactionResult {
  assertFingerprint(manifest, options.sourceFingerprint);
  const clip = manifest.extractedClips.find((item) => item.id === options.clipId);
  if (!clip) throw new Error("Extracted clip not found.");
  const clips = withChronologicalSequences(
    manifest.extractedClips.filter((item) => item.id !== clip.id),
  );
  const historyEntry: CutterEditHistoryEntry = {
    id: `RETURN-${clip.id}-${Date.parse(options.now).toString(36)}`,
    action: "return",
    clip,
    sourcePlayheadSec: options.sourcePlayheadSec,
    activeInSec: options.activeInSec,
    createdAt: options.now,
  };
  const nextManifest: CutterManifest = {
    ...manifest,
    extractedClips: clips,
    editHistory: pushHistory(manifest.editHistory, historyEntry),
    updatedAt: options.now,
  };
  const remainingRanges = deriveRemainingRanges(manifest.sourceDurationSec, clips);
  return {
    manifest: nextManifest,
    affectedClip: clip,
    sourcePlayheadSec: clip.sourceInSec,
    workingTimeSec: sourceTimeToWorkingTime(clip.sourceInSec, remainingRanges),
    activeInSec: null,
  };
}

export function applyUndoTransaction(
  manifest: CutterManifest,
  options: { sourceFingerprint: string; now: string },
): CutterTransactionResult {
  assertFingerprint(manifest, options.sourceFingerprint);
  const historyEntry = manifest.editHistory.at(-1);
  if (!historyEntry) throw new Error("Nothing to undo.");

  let clips: CutterClip[];
  let activeInSec: number | null;
  if (historyEntry.action === "extract") {
    clips = manifest.extractedClips.filter((clip) => clip.id !== historyEntry.clip.id);
    activeInSec = historyEntry.activeInSec;
  } else {
    const validation = validateExtractionRange(
      historyEntry.clip.sourceInSec,
      historyEntry.clip.sourceOutSec,
      manifest.sourceDurationSec,
      manifest.extractedClips,
    );
    if (!validation.ok) throw new Error(`Cannot undo Return: ${validation.errors.join(" ")}`);
    clips = [...manifest.extractedClips, historyEntry.clip];
    activeInSec = historyEntry.activeInSec;
  }
  clips = withChronologicalSequences(clips);
  const nextManifest: CutterManifest = {
    ...manifest,
    extractedClips: clips,
    editHistory: manifest.editHistory.slice(0, -1),
    updatedAt: options.now,
  };
  const remainingRanges = deriveRemainingRanges(manifest.sourceDurationSec, clips);
  const sourcePlayheadSec =
    historyEntry.action === "extract"
      ? historyEntry.clip.sourceInSec
      : historyEntry.sourcePlayheadSec;
  return {
    manifest: nextManifest,
    affectedClip: historyEntry.clip,
    sourcePlayheadSec,
    workingTimeSec: sourceTimeToWorkingTime(sourcePlayheadSec, remainingRanges),
    activeInSec,
  };
}

export function updateCutterClip(
  manifest: CutterManifest,
  options: {
    sourceFingerprint: string;
    clipId: string;
    title?: string;
    includeForExport?: boolean;
    notes?: string;
    now: string;
  },
): CutterManifest {
  assertFingerprint(manifest, options.sourceFingerprint);
  const clip = manifest.extractedClips.find((item) => item.id === options.clipId);
  if (!clip) throw new Error("Extracted clip not found.");
  const title =
    options.title === undefined
      ? clip.title
      : cleanTitleText(options.title) ||
        `Clip ${String(Math.max(1, clip.sequence)).padStart(3, "0")}`;
  const updated: CutterClip = {
    ...clip,
    title,
    titleSource: options.title === undefined ? clip.titleSource : "operator",
    titleConfidence: options.title === undefined ? clip.titleConfidence : "high",
    includeForExport: options.includeForExport ?? clip.includeForExport,
    notes: options.notes ?? clip.notes,
    updatedAt: options.now,
  };
  return {
    ...manifest,
    extractedClips: withChronologicalSequences(
      manifest.extractedClips.map((item) => (item.id === clip.id ? updated : item)),
    ),
    updatedAt: options.now,
  };
}

export function migrateLegacyManualSegments(
  legacySegments: LegacyManualSegment[],
  options: {
    sourceFilename: string;
    sourceFingerprint: string;
    sourceDurationSec: number;
    now: string;
  },
): { manifest: CutterManifest; migratedCount: number; skippedCount: number } {
  let manifest = createEmptyCutterManifest(options);
  let migratedCount = 0;
  let skippedCount = 0;

  for (const legacy of legacySegments) {
    const explicitlyManual =
      legacy.provenance === "manual" || /^manual-/i.test(legacy.id ?? "");
    const sourceMatches =
      legacy.sourceFilename === options.sourceFilename &&
      legacy.sourceFingerprint === options.sourceFingerprint;
    const sourceInSec = Number(legacy.startSeconds);
    const sourceOutSec = Number(legacy.endSeconds);
    const validation = validateExtractionRange(
      sourceInSec,
      sourceOutSec,
      options.sourceDurationSec,
      manifest.extractedClips,
    );
    if (!explicitlyManual || !sourceMatches || !validation.ok) {
      skippedCount += 1;
      continue;
    }

    const createdAt = legacy.createdAt || options.now;
    const genericTitle = /^clip\s+\d+$/i.test(legacy.title?.trim() ?? "");
    const clip: CutterClip = {
      id:
        legacy.id?.trim() ||
        createStableClipId(options.sourceFingerprint, sourceInSec, sourceOutSec, createdAt),
      sequence: manifest.extractedClips.length + 1,
      sourceInSec,
      sourceOutSec,
      durationSec: roundTime(sourceOutSec - sourceInSec),
      title:
        legacy.title?.trim() ||
        `Clip ${String(manifest.extractedClips.length + 1).padStart(3, "0")}`,
      titleSource: genericTitle || !legacy.title?.trim() ? "fallback" : "operator",
      titleConfidence: genericTitle || !legacy.title?.trim() ? "low" : "high",
      transcriptSegmentIds: legacy.transcriptSegmentIds ?? [],
      transcriptExcerpt: legacy.transcriptExcerpt?.trim() ?? "",
      transcriptCoverage: legacy.transcriptExcerpt?.trim() ? "partial" : "none",
      notes: legacy.notes ?? "",
      includeForExport: legacy.includeForExport ?? true,
      provenance: "manual",
      createdAt,
      updatedAt: legacy.modifiedAt || createdAt,
    };
    manifest = {
      ...manifest,
      extractedClips: withChronologicalSequences([...manifest.extractedClips, clip]),
    };
    migratedCount += 1;
  }

  manifest.updatedAt = options.now;
  return { manifest, migratedCount, skippedCount };
}
