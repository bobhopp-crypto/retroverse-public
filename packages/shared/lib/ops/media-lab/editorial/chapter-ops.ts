import type { EditorialChapter } from "../chapters-csv";
import { normalizeChapterTimeline } from "../chapters-csv";

export function mergeAdjacentChapters(
  chapters: EditorialChapter[],
  selectedIds: string[],
  mergedTitle: string,
  videoEndSec: number,
): EditorialChapter[] {
  const indices = selectedIds
    .map((id) => chapters.findIndex((c) => c.id === id))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);

  if (indices.length < 2) {
    throw new Error("Select at least two chapters to merge.");
  }

  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) {
      throw new Error("Only adjacent chapters can be merged.");
    }
  }

  const first = indices[0];
  const last = indices[indices.length - 1];
  const merged: EditorialChapter = {
    id: chapters[first].id,
    startSec: chapters[first].startSec,
    endSec: chapters[last].endSec,
    title: mergedTitle.trim() || chapters[first].title,
  };

  const out = [
    ...chapters.slice(0, first),
    merged,
    ...chapters.slice(last + 1),
  ];

  return normalizeChapterTimeline(out, videoEndSec);
}

export function splitChapter(
  chapters: EditorialChapter[],
  chapterId: string,
  splitAtSec: number,
  videoEndSec: number,
  rightTitle?: string,
): EditorialChapter[] {
  const idx = chapters.findIndex((c) => c.id === chapterId);
  if (idx < 0) throw new Error("Chapter not found.");

  const ch = chapters[idx];
  if (splitAtSec <= ch.startSec + 1 || splitAtSec >= ch.endSec - 1) {
    throw new Error("Split time must be at least 1s inside the chapter.");
  }

  const left: EditorialChapter = {
    id: ch.id,
    startSec: ch.startSec,
    endSec: splitAtSec,
    title: ch.title,
  };
  const right: EditorialChapter = {
    id: `${ch.id}-split-${Date.now()}`,
    startSec: splitAtSec,
    endSec: ch.endSec,
    title: rightTitle?.trim() || `${ch.title} (cont.)`,
  };

  const out = [...chapters.slice(0, idx), left, right, ...chapters.slice(idx + 1)];
  return normalizeChapterTimeline(out, videoEndSec);
}

export function deleteChapter(
  chapters: EditorialChapter[],
  chapterId: string,
  videoEndSec: number,
): EditorialChapter[] {
  const out = chapters.filter((c) => c.id !== chapterId);
  if (out.length === chapters.length) throw new Error("Chapter not found.");
  return normalizeChapterTimeline(out, videoEndSec);
}

export function renameChapter(
  chapters: EditorialChapter[],
  chapterId: string,
  title: string,
): EditorialChapter[] {
  return chapters.map((c) =>
    c.id === chapterId ? { ...c, title: title.trim() || c.title } : c,
  );
}
