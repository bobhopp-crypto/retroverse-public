import type { TranscriptSegment } from "../build-chapters-from-segments";
import type { EditorialChapter } from "../chapters-csv";
import {
  brandsMatchTitle,
  extractBrandFromText,
  extractBrandFromTitle,
  isContinuationFragment,
  suggestMergedTitle,
  transcriptSimilarity,
} from "./brand-utils";

export type MergeSuggestion = {
  leftChapterId: string;
  rightChapterId: string;
  leftTitle: string;
  rightTitle: string;
  suggestedTitle: string;
  confidence: number;
  reasons: string[];
};

function tokenSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function rangeText(
  segments: TranscriptSegment[],
  start: number,
  end: number,
): string {
  return segments
    .filter((s) => s.start >= start - 0.05 && s.start < end)
    .map((s) => s.text)
    .join(" ");
}

export function suggestAdjacentMerges(
  chapters: EditorialChapter[],
  segments: TranscriptSegment[],
): MergeSuggestion[] {
  const out: MergeSuggestion[] = [];

  for (let i = 0; i < chapters.length - 1; i++) {
    const left = chapters[i];
    const right = chapters[i + 1];
    const reasons: string[] = [];
    let score = 0;

    const leftDur = left.endSec - left.startSec;
    const rightDur = right.endSec - right.startSec;
    const leftText = rangeText(segments, left.startSec, left.endSec);
    const rightText = rangeText(segments, right.startSec, right.endSec);
    const combinedText = `${leftText} ${rightText}`;

    if (brandsMatchTitle(left.title, right.title)) {
      score += 42;
      reasons.push("Same brand in titles");
    }

    const brandL = extractBrandFromTitle(left.title) ?? extractBrandFromText(leftText);
    const brandR = extractBrandFromTitle(right.title) ?? extractBrandFromText(rightText);
    if (brandL && brandR && brandL === brandR) {
      score += 28;
      reasons.push(`Same product: ${brandL}`);
    }

    const titleJac = jaccard(tokenSet(left.title), tokenSet(right.title));
    if (titleJac >= 0.35) {
      score += Math.round(titleJac * 25);
      reasons.push("Similar titles");
    }

    const textJac = transcriptSimilarity(leftText, rightText);
    if (textJac >= 0.2) {
      score += Math.round(textJac * 20);
      reasons.push("Similar transcript");
    }

    if (isContinuationFragment(leftText, rightText)) {
      score += 35;
      reasons.push("Continuation fragment");
    }

    if (leftDur < 15 || rightDur < 15) {
      score += 22;
      reasons.push("Under 15s fragment");
    } else if (leftDur < 20 || rightDur < 20) {
      score += 18;
      reasons.push("Short fragment");
    }

    if (leftDur + rightDur <= 95) {
      score += 8;
      reasons.push("Combined length fits one spot");
    }

    if (/covergirl|clean makeup|makeup/i.test(left.title) && /covergirl|makeup/i.test(right.title)) {
      score += 15;
      reasons.push("Same commercial theme");
    }

    if (score < 40) continue;

    const confidence = Math.min(98, Math.max(40, score));
    out.push({
      leftChapterId: left.id,
      rightChapterId: right.id,
      leftTitle: left.title,
      rightTitle: right.title,
      suggestedTitle: suggestMergedTitle(left.title, right.title),
      confidence,
      reasons,
    });
  }

  return out.sort((a, b) => b.confidence - a.confidence);
}
