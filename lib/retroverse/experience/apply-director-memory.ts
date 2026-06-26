import { chapterDirectorId } from "./experience-director";
import type { DirectorPlan } from "./experience-director";
import type { ExperienceChapter } from "./experience-types";

/** On return visits, lead with an unseen major chapter when the opening was already seen. */
export function applyMemoryToChapters(
  chapters: ExperienceChapter[],
  director: DirectorPlan,
  seenChapterIds: string[],
): ExperienceChapter[] {
  if (seenChapterIds.length === 0 || !seenChapterIds.includes(director.openingId)) {
    return chapters;
  }

  const alternateId = director.majorIds.find(
    (id) => !seenChapterIds.includes(id) && id !== director.openingId,
  );
  if (!alternateId) return chapters;

  const openingIdx = chapters.findIndex(
    (chapter, index) => chapterDirectorId(chapter, index) === director.openingId,
  );
  const alternateIdx = chapters.findIndex(
    (chapter, index) => chapterDirectorId(chapter, index) === alternateId,
  );
  if (openingIdx < 0 || alternateIdx < 0 || openingIdx === alternateIdx) return chapters;

  const next = [...chapters];
  [next[openingIdx], next[alternateIdx]] = [next[alternateIdx]!, next[openingIdx]!];
  return next;
}
