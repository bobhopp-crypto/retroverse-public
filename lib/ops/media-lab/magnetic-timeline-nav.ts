import type { EditorialChapterRow } from "@/lib/ops/media-lab/editorial/editorial-types";

export const MAGNETIC_MIN_CLIP_WIDTH_PX = 48;
export const MERGE_HANDLE_WIDTH_PX = 10;

const MIN_CLIP_SEC_FALLBACK = 1;

export function clipDurationSec(chapter: EditorialChapterRow): number {
  const span = chapter.endSec - chapter.startSec;
  if (span > 0) return span;
  return Math.max(chapter.durationSec, MIN_CLIP_SEC_FALLBACK);
}

export function clipWidthPx(chapter: EditorialChapterRow, pxPerSec: number): number {
  return Math.max(
    MAGNETIC_MIN_CLIP_WIDTH_PX,
    Math.round(clipDurationSec(chapter) * pxPerSec),
  );
}

export function magneticTrackWidthPx(chapters: EditorialChapterRow[], pxPerSec: number): number {
  const clipSum = chapters.reduce((sum, ch) => sum + clipWidthPx(ch, pxPerSec), 0);
  const handleSum = chapters.length > 1 ? (chapters.length - 1) * MERGE_HANDLE_WIDTH_PX : 0;
  return clipSum + handleSum;
}

/** Map source video time → horizontal pixel on the magnetic track. */
export function sourceSecToMagneticX(
  sec: number,
  chapters: EditorialChapterRow[],
  pxPerSec: number,
): number {
  if (chapters.length === 0) return 0;
  let x = 0;
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    if (i > 0) x += MERGE_HANDLE_WIDTH_PX;
    const w = clipWidthPx(ch, pxPerSec);
    const span = Math.max(ch.endSec - ch.startSec, MIN_CLIP_SEC_FALLBACK);
    if (sec >= ch.endSec) {
      x += w;
      continue;
    }
    if (sec >= ch.startSec) {
      const frac = Math.max(0, Math.min(1, (sec - ch.startSec) / span));
      return x + frac * w;
    }
    return x;
  }
  return x;
}

/** Map magnetic track pixel → source video time. */
export function magneticXToSourceSec(
  x: number,
  chapters: EditorialChapterRow[],
  pxPerSec: number,
): number {
  if (chapters.length === 0) return 0;
  let cursor = 0;
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    if (i > 0) {
      if (x <= cursor + MERGE_HANDLE_WIDTH_PX) return ch.startSec;
      cursor += MERGE_HANDLE_WIDTH_PX;
    }
    const w = clipWidthPx(ch, pxPerSec);
    if (x <= cursor + w) {
      const span = Math.max(ch.endSec - ch.startSec, MIN_CLIP_SEC_FALLBACK);
      const frac = w > 0 ? Math.max(0, Math.min(1, (x - cursor) / w)) : 0;
      return ch.startSec + frac * span;
    }
    cursor += w;
  }
  const last = chapters[chapters.length - 1];
  return last?.endSec ?? 0;
}

export function visibleSourceRange(
  scrollLeft: number,
  clientWidth: number,
  chapters: EditorialChapterRow[],
  pxPerSec: number,
): { startSec: number; endSec: number } {
  const startSec = magneticXToSourceSec(scrollLeft, chapters, pxPerSec);
  const endSec = magneticXToSourceSec(scrollLeft + clientWidth, chapters, pxPerSec);
  return { startSec, endSec };
}

export function secToMinimapFrac(sec: number, showDurationSec: number): number {
  if (showDurationSec <= 0) return 0;
  return Math.max(0, Math.min(1, sec / showDurationSec));
}
