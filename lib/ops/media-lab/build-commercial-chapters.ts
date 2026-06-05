/**
 * Commercial compilation mode — gap-first boundaries, brand/similarity merge.
 */

import type { ContentChapter, TranscriptSegment } from "./build-chapters-from-segments";
import {
  commercialTitleForText,
  extractBrandFromText,
  normalizeCommercialText,
  transcriptSimilarity,
} from "./commercial/brand-detect";
import {
  blockDuration,
  blockText,
  HARD_BREAK_GAP_SEC,
  MAX_COMMERCIAL_SEC,
  mergeUntilStable,
  shouldPersistMerge,
  SOFT_BREAK_GAP_SEC,
  TARGET_MAX_SEC,
  type CommercialBlock,
} from "./commercial/merge-passes";

const MIN_DURATION_SEC = 15;
const TARGET_MIN_SEC = 30;

const NETWORK_BREAK_RE =
  /\b(NBC|CBS|ABC|BBC|FOX)\b.*\b(ident|station|network|we(?:'ll| will)\s+return|stay\s+tuned)\b/i;

function titleForBlock(block: CommercialBlock): string {
  const text = blockText(block);
  const brand = extractBrandFromText(text);
  if (brand) return `Commercial - ${brand}`;

  if (NETWORK_BREAK_RE.test(text)) {
    const net = text.match(/\b(NBC|CBS|ABC|BBC|FOX)\b/i);
    return net ? `Commercial - ${net[1].toUpperCase()} Network` : "Commercial - Network";
  }

  return commercialTitleForText(text);
}

/** Split only on silence gaps — not speaker/entity changes. */
function groupSegments(segments: TranscriptSegment[]): CommercialBlock[] {
  const blocks: CommercialBlock[] = [];
  let cur: CommercialBlock | null = null;
  let prevEnd = 0;

  for (const seg of segments) {
    const text = normalizeCommercialText(seg.text);
    if (!text) continue;

    const gap = cur ? Math.max(0, seg.start - prevEnd) : 0;
    const hardBreak = cur != null && gap >= HARD_BREAK_GAP_SEC;
    const softBreak =
      cur != null &&
      gap >= SOFT_BREAK_GAP_SEC &&
      !shouldPersistMerge(cur, { start: seg.start, end: seg.end, texts: [text] });

    if (!cur) {
      cur = { start: seg.start, end: seg.end, texts: [text] };
    } else if (hardBreak || softBreak) {
      blocks.push(cur);
      cur = { start: seg.start, end: seg.end, texts: [text] };
    } else {
      cur.end = seg.end;
      cur.texts.push(text);
    }

    prevEnd = seg.end;
  }

  if (cur) blocks.push(cur);
  return blocks;
}

function mergeBlock(into: CommercialBlock, from: CommercialBlock): void {
  into.end = from.end;
  into.texts.push(...from.texts);
}

function enforceMinDuration(blocks: CommercialBlock[]): CommercialBlock[] {
  if (blocks.length <= 1) return blocks;

  const out = blocks.map((b) => ({ ...b, texts: [...b.texts] }));

  for (let i = 0; i < out.length; i++) {
    if (blockDuration(out[i]) >= MIN_DURATION_SEC) continue;

    const prev = out[i - 1];
    const cur = out[i];
    const next = out[i + 1];

    if (prev && shouldPersistMerge(prev, cur)) {
      mergeBlock(prev, cur);
      out.splice(i, 1);
      i--;
      continue;
    }
    if (next && shouldPersistMerge(cur, next)) {
      mergeBlock(cur, next);
      out.splice(i + 1, 1);
      continue;
    }
    if (prev && blockDuration(prev) + blockDuration(cur) <= MAX_COMMERCIAL_SEC) {
      mergeBlock(prev, cur);
      out.splice(i, 1);
      i--;
      continue;
    }
    if (next && blockDuration(cur) + blockDuration(next) <= MAX_COMMERCIAL_SEC) {
      mergeBlock(cur, next);
      out.splice(i + 1, 1);
    }
  }

  return out;
}

function largestInternalGap(
  block: CommercialBlock,
  segments: TranscriptSegment[],
): number | null {
  const inner = segments.filter(
    (s) => s.start >= block.start - 0.05 && s.end <= block.end + 0.05,
  );
  if (inner.length < 2) return null;

  let bestGap = 0;
  let bestAt: number | null = null;

  for (let i = 0; i < inner.length - 1; i++) {
    const gap = inner[i + 1].start - inner[i].end;
    if (gap > bestGap) {
      bestGap = gap;
      bestAt = inner[i + 1].start;
    }
  }

  return bestAt;
}

function splitBlockAt(
  block: CommercialBlock,
  splitAt: number,
  segments: TranscriptSegment[],
): [CommercialBlock, CommercialBlock] {
  const left: CommercialBlock = { start: block.start, end: splitAt, texts: [] };
  const right: CommercialBlock = { start: splitAt, end: block.end, texts: [] };
  const inner = segments.filter(
    (s) => s.start >= block.start - 0.05 && s.end <= block.end + 0.05,
  );

  for (const seg of inner) {
    const text = normalizeCommercialText(seg.text);
    if (!text) continue;
    if (seg.start < splitAt) {
      left.texts.push(text);
      left.end = Math.max(left.end, seg.end);
    } else {
      right.texts.push(text);
      right.start = Math.min(right.start, seg.start);
      right.end = Math.max(right.end, seg.end);
    }
  }

  return [left, right];
}

function splitOversized(blocks: CommercialBlock[], segments: TranscriptSegment[]): CommercialBlock[] {
  const out: CommercialBlock[] = [];

  for (const block of blocks) {
    if (blockDuration(block) <= TARGET_MAX_SEC) {
      out.push(block);
      continue;
    }

    let splitAt = largestInternalGap(block, segments);
    if (
      splitAt == null ||
      splitAt <= block.start + MIN_DURATION_SEC ||
      splitAt >= block.end - MIN_DURATION_SEC
    ) {
      splitAt = block.start + blockDuration(block) / 2;
    }

    const [left, right] = splitBlockAt(block, splitAt, segments);
    if (blockDuration(left) >= MIN_DURATION_SEC) out.push(left);
    else if (out.length) mergeBlock(out[out.length - 1], left);
    else out.push(left);

    if (blockDuration(right) >= MIN_DURATION_SEC) out.push(right);
    else if (out.length) mergeBlock(out[out.length - 1], right);
    else out.push(right);
  }

  return mergeUntilStable(out);
}

function splitOversizedUntilDone(
  blocks: CommercialBlock[],
  segments: TranscriptSegment[],
): CommercialBlock[] {
  let out = blocks;
  for (let pass = 0; pass < 40; pass++) {
    const next = splitOversized(out, segments);
    const maxDur = Math.max(...next.map(blockDuration));
    out = next;
    if (maxDur <= TARGET_MAX_SEC) break;
  }
  return out;
}

function coalesceShortAdjacent(blocks: CommercialBlock[]): CommercialBlock[] {
  const out = blocks.map((b) => ({ ...b, texts: [...b.texts] }));
  let changed = true;

  while (changed) {
    changed = false;
    for (let i = 0; i < out.length - 1; i++) {
      const cur = out[i];
      const next = out[i + 1];
      const curDur = blockDuration(cur);
      const nextDur = blockDuration(next);
      const combined = curDur + nextDur;

      const shouldMerge =
        combined <= MAX_COMMERCIAL_SEC &&
        shouldPersistMerge(cur, next) &&
        (curDur < TARGET_MIN_SEC || nextDur < TARGET_MIN_SEC);

      if (shouldMerge) {
        mergeBlock(cur, next);
        out.splice(i + 1, 1);
        changed = true;
        break;
      }
    }
  }

  return out;
}

export function buildCommercialCompilationChapters(
  segments: TranscriptSegment[],
): ContentChapter[] {
  if (segments.length === 0) {
    return [{ start: 0, end: 0, title: "Commercial - Full reel", kind: "commercial" }];
  }

  const videoEnd = segments[segments.length - 1].end;
  const firstStart = segments[0].start;

  let blocks = groupSegments(segments);
  blocks = mergeUntilStable(blocks);
  blocks = coalesceShortAdjacent(blocks);
  blocks = enforceMinDuration(blocks);
  blocks = mergeUntilStable(blocks);
  blocks = splitOversizedUntilDone(blocks, segments);
  blocks = enforceMinDuration(blocks);
  blocks = mergeUntilStable(blocks);

  const chapters: ContentChapter[] = blocks.map((b) => ({
    start: b.start,
    end: b.end,
    title: titleForBlock(b),
    kind: "commercial" as const,
  }));

  if (chapters.length === 0) {
    return [{ start: firstStart, end: videoEnd, title: "Commercial - Full reel", kind: "commercial" }];
  }

  chapters[0].start = firstStart;
  chapters[chapters.length - 1].end = videoEnd;
  for (let i = 0; i < chapters.length - 1; i++) {
    chapters[i].end = chapters[i + 1].start;
  }

  return chapters;
}

/** Exported for tests — adjacent pair similarity check. */
export function adjacentTranscriptSimilarity(
  a: CommercialBlock,
  b: CommercialBlock,
): number {
  return transcriptSimilarity(blockText(a), blockText(b));
}
