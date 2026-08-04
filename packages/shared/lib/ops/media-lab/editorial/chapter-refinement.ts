import type { TranscriptSegment } from "../build-chapters-from-segments";
import type { EditorialChapter } from "../chapters-csv";

export const REFINEMENT_MAX_DURATION_SEC = 10 * 60;
export const REFINEMENT_MIN_DURATION_SEC = 30;

export type RefinedChapterSuggestion = {
  refinementVersion: "v1";
  id: string;
  parentChapterId: string;
  parentStartSec: number;
  parentEndSec: number;
  startSec: number;
  endSec: number;
  durationSec: number;
  transcriptSegmentIds: string[];
  transcriptExcerpt: string;
  splitReason: string;
  sourceFingerprint?: string;
  analysisRunId: string;
  generatedAt: string;
  reviewStatus: "unapproved";
};

function stableChildId(parentId: string, startSec: number, endSec: number): string {
  return `refined-${parentId}-${Math.round(startSec * 1000)}-${Math.round(endSec * 1000)}`;
}

function boundaryCandidates(
  chapter: EditorialChapter,
  segments: TranscriptSegment[],
): number[] {
  return segments
    .map((segment) => segment.start)
    .filter((start) => start > chapter.startSec && start < chapter.endSec)
    .sort((a, b) => a - b);
}

function chooseBoundary(
  target: number,
  candidates: number[],
  lowerBound: number,
  upperBound: number,
): number | null {
  const eligible = candidates.filter(
    (candidate) => candidate >= lowerBound && candidate <= upperBound,
  );
  if (eligible.length === 0) return null;
  return eligible.reduce((best, candidate) =>
    Math.abs(candidate - target) < Math.abs(best - target) ? candidate : best,
  );
}

function includedSegments(
  segments: TranscriptSegment[],
  startSec: number,
  endSec: number,
): { ids: string[]; excerpt: string } {
  const included = segments
    .map((segment, index) => ({ segment, index }))
    .filter(({ segment }) => segment.end > startSec && segment.start < endSec);
  return {
    ids: included.map(({ index }) => `seg-${index}`),
    excerpt: included.map(({ segment }) => segment.text.trim()).join(" ").slice(0, 360),
  };
}

export function refineOversizedChapters(
  chapters: EditorialChapter[],
  segments: TranscriptSegment[],
  options: {
    sourceFingerprint?: string;
    analysisRunId: string;
    generatedAt?: string;
    maxDurationSec?: number;
  },
): RefinedChapterSuggestion[] {
  const maxDurationSec = options.maxDurationSec ?? REFINEMENT_MAX_DURATION_SEC;
  const generatedAt = options.generatedAt ?? new Date(0).toISOString();
  const out: RefinedChapterSuggestion[] = [];

  for (const chapter of chapters) {
    if (chapter.endSec - chapter.startSec <= maxDurationSec) continue;
    const boundaries = boundaryCandidates(chapter, segments);
    let startSec = chapter.startSec;
    while (chapter.endSec - startSec > maxDurationSec) {
      const remaining = chapter.endSec - startSec;
      const target = startSec + maxDurationSec;
      const boundary = chooseBoundary(
        target,
        boundaries,
        startSec + REFINEMENT_MIN_DURATION_SEC,
        chapter.endSec,
      );
      if (boundary == null || boundary <= startSec) break;
      const tailAfter = chapter.endSec - boundary;
      if (tailAfter < REFINEMENT_MIN_DURATION_SEC) {
        const details = includedSegments(segments, startSec, chapter.endSec);
        out.push({
          refinementVersion: "v1",
          id: stableChildId(chapter.id, startSec, chapter.endSec),
          parentChapterId: chapter.id,
          parentStartSec: chapter.startSec,
          parentEndSec: chapter.endSec,
          startSec,
          endSec: chapter.endSec,
          durationSec: chapter.endSec - startSec,
          transcriptSegmentIds: details.ids,
          transcriptExcerpt: details.excerpt,
          splitReason: `short tail merged into previous child; retained complete source coverage`,
          sourceFingerprint: options.sourceFingerprint,
          analysisRunId: options.analysisRunId,
          generatedAt,
          reviewStatus: "unapproved",
        });
        startSec = chapter.endSec;
        break;
      }
      const details = includedSegments(segments, startSec, boundary);
      out.push({
        refinementVersion: "v1",
        id: stableChildId(chapter.id, startSec, boundary),
        parentChapterId: chapter.id,
        parentStartSec: chapter.startSec,
        parentEndSec: chapter.endSec,
        startSec,
        endSec: boundary,
        durationSec: boundary - startSec,
        transcriptSegmentIds: details.ids,
        transcriptExcerpt: details.excerpt,
        splitReason: `parent chapter exceeded ${maxDurationSec / 60}-minute maximum; split at transcript boundary`,
        sourceFingerprint: options.sourceFingerprint,
        analysisRunId: options.analysisRunId,
        generatedAt,
        reviewStatus: "unapproved",
      });
      startSec = boundary;
      if (remaining <= maxDurationSec) break;
    }
    if (startSec < chapter.endSec) {
      const details = includedSegments(segments, startSec, chapter.endSec);
      out.push({
        refinementVersion: "v1",
        id: stableChildId(chapter.id, startSec, chapter.endSec),
        parentChapterId: chapter.id,
        parentStartSec: chapter.startSec,
        parentEndSec: chapter.endSec,
        startSec,
        endSec: chapter.endSec,
        durationSec: chapter.endSec - startSec,
        transcriptSegmentIds: details.ids,
        transcriptExcerpt: details.excerpt,
        splitReason: `refined tail of parent chapter; retained complete source coverage`,
        sourceFingerprint: options.sourceFingerprint,
        analysisRunId: options.analysisRunId,
        generatedAt,
        reviewStatus: "unapproved",
      });
    }
  }

  return out;
}
