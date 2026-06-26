import type { ExperienceChapter, ExperienceChapterKind, SongExperience } from "./experience-types";
import type { DirectorPlan } from "./experience-director";
import { chapterDirectorId } from "./experience-director";

export type LivingChapterSchedule = {
  id: string;
  kind: ExperienceChapterKind;
  revealAtSec: number;
  optional: boolean;
  role: "opening" | "middle" | "ending" | "optional";
  title?: string;
  storyKey?: string;
};

export type LivingSongPlan = {
  durationSec: number;
  schedules: LivingChapterSchedule[];
  openingId: string;
  openingTitle: string;
};

function parseDurationSec(length: string | null | undefined): number | null {
  if (!length?.trim()) return null;
  const parts = length.trim().split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n))) return null;
  if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  if (parts.length === 2) return parts[0]! * 60 + parts[1]!;
  if (parts.length === 1) return parts[0]!;
  return null;
}

export function estimateSongDurationSec(input: {
  lengthHint?: string | null;
  majorChapterCount?: number;
}): number {
  const parsed = parseDurationSec(input.lengthHint);
  if (parsed != null && parsed >= 60) return parsed;
  const major = input.majorChapterCount ?? 3;
  return Math.min(360, Math.max(180, 140 + major * 18));
}

export function buildLivingTimeline(
  experience: SongExperience,
  durationSec: number,
): LivingChapterSchedule[] {
  const director = experience.director;
  const metaById = new Map(director.chapters.map((c) => [c.id, c]));

  const schedules: LivingChapterSchedule[] = experience.chapters.map((chapter, index) => {
    const id = chapterDirectorId(chapter, index);
    const meta = metaById.get(id);
    return {
      id,
      kind: chapter.kind,
      revealAtSec: 0,
      optional: meta?.role === "optional",
      role: meta?.role ?? "optional",
      title:
        chapter.kind === "story" || chapter.kind === "timeline"
          ? chapter.title
          : chapter.kind === "discover"
            ? chapter.shelves[0]?.title
            : undefined,
      storyKey: meta?.storyKey,
    };
  });

  if (schedules.length === 0) return schedules;

  const usable = Math.max(60, durationSec - 8);
  const major = schedules.filter((s) => s.role !== "optional");
  const optional = schedules.filter((s) => s.role === "optional");

  let t = Math.min(4, usable * 0.02);
  for (let i = 0; i < major.length; i += 1) {
    const slot = major[i]!;
    slot.revealAtSec = t;
    const span =
      i === 0
        ? usable * 0.18
        : i === major.length - 1
          ? usable * 0.12
          : usable * 0.5 / Math.max(1, major.length - 2);
    t += span;
  }

  let optStart = usable * 0.82;
  for (const slot of optional) {
    slot.revealAtSec = optStart;
    optStart += usable * 0.04;
  }

  return schedules;
}

export function buildLivingSongPlan(input: {
  experience: SongExperience;
  durationSec?: number;
  lengthHint?: string | null;
}): LivingSongPlan {
  const majorCount = input.experience.director.majorIds.length;
  const durationSec =
    input.durationSec ??
    estimateSongDurationSec({ lengthHint: input.lengthHint, majorChapterCount: majorCount });

  return {
    durationSec,
    schedules: buildLivingTimeline(input.experience, durationSec),
    openingId: input.experience.director.openingId,
    openingTitle: input.experience.director.openingTitle,
  };
}

export function revealedChapterIds(
  schedules: LivingChapterSchedule[],
  currentTimeSec: number,
): Set<string> {
  const revealed = new Set<string>();
  for (const schedule of schedules) {
    if (currentTimeSec + 0.35 < schedule.revealAtSec) continue;
    revealed.add(schedule.id);
  }
  return revealed;
}

export function scheduleById(
  schedules: LivingChapterSchedule[],
): Map<string, LivingChapterSchedule> {
  return new Map(schedules.map((schedule) => [schedule.id, schedule]));
}
