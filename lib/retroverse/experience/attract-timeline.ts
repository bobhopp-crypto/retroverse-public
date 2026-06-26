/** Abbreviated museum-tour beats within one song (~8–12 seconds). */

import type { ExperienceChapterKind } from "./experience-types";

export type AttractBeat = "hero" | "chart" | "story" | "discover";

export type AttractBeatSchedule = {
  beat: AttractBeat;
  atSec: number;
};

export const ATTRACT_SONG_MIN_SEC = 8;
export const ATTRACT_SONG_MAX_SEC = 12;
export const ATTRACT_SONG_DEFAULT_SEC = 10;

export const ATTRACT_INACTIVITY_RESUME_MS = 45_000;
export const ATTRACT_LIVE_END_DELAY_MS = 8_000;

export function attractSongDurationSec(storyScore: number): number {
  const bonus = Math.min(storyScore, 6) * 0.25;
  return Math.min(ATTRACT_SONG_MAX_SEC, ATTRACT_SONG_DEFAULT_SEC + bonus);
}

/** Beat timeline for a single song slot. */
export function buildAttractBeatSchedule(durationSec: number): AttractBeatSchedule[] {
  return [
    { beat: "hero", atSec: 0 },
    { beat: "chart", atSec: durationSec * 0.22 },
    { beat: "story", atSec: durationSec * 0.48 },
    { beat: "discover", atSec: durationSec * 0.74 },
  ];
}

/** Director-led beat order — opening chapter kind leads after hero. */
export function buildDirectorAttractBeatSchedule(
  durationSec: number,
  openingKind: ExperienceChapterKind,
): AttractBeatSchedule[] {
  const middle: AttractBeat[] =
    openingKind === "chart_journey"
      ? ["chart", "story", "discover"]
      : openingKind === "discover"
        ? ["discover", "story", "chart"]
        : ["story", "chart", "discover"];

  const beats: AttractBeat[] = ["hero", ...middle];
  const step = durationSec / beats.length;
  return beats.map((beat, index) => ({ beat, atSec: index * step }));
}

export function activeAttractBeat(
  schedules: AttractBeatSchedule[],
  elapsedSec: number,
): AttractBeat {
  let current: AttractBeat = "hero";
  for (const slot of schedules) {
    if (elapsedSec + 0.05 >= slot.atSec) current = slot.beat;
  }
  return current;
}
