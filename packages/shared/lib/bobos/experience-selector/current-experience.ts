import { normalizePlayheadPayload, playheadStageKey } from "@/lib/broadcast/normalize-playhead";
import type { PlayheadPayload, PlayheadPayloadCore } from "@/lib/bobos/presentation/types";

import type { Experience, ExperienceId } from "./types";

function emptyCore(now: Date): PlayheadPayloadCore {
  return {
    onAir: false,
    presentation: null,
    item: null,
    itemIndex: -1,
    itemCount: 0,
    mode: "paused",
    elapsedSeconds: 0,
    nextItem: null,
    queue: null,
    publishedAt: null,
    updatedAt: now.toISOString(),
    autoFollowVdj: false,
    manualTakeActive: true,
    vdj: {
      playing: false,
      rvtr: null,
      takeoverActive: false,
      resumeBroadcastAt: null,
    },
  };
}

/** Attach the website contract slice from a full playhead payload. */
export function experiencePayloadFromPlayhead(
  payload: PlayheadPayload,
): Experience["payload"] {
  return {
    rvba: payload.rvba,
    broadcast: payload.broadcast,
  };
}

/** Build the one canonical playhead payload from a resolved experience. */
export function playheadFromExperience(experience: Experience, now: Date = new Date()): PlayheadPayload {
  const core = experience.playhead ?? emptyCore(now);
  return normalizePlayheadPayload(
    {
      ...core,
      onAir: experience.available && experience.payload.rvba != null,
      manualTakeActive: true,
      autoFollowVdj: false,
      broadcast: experience.payload.broadcast ?? undefined,
      rvba: experience.payload.rvba,
    },
    now,
  );
}

/** Stable remount key shared by selector cards, Current Output, and public. */
export function currentExperienceStageKey(payload: PlayheadPayload): string {
  return playheadStageKey(payload);
}

export function alignSelectedExperiencePayload(
  experiences: Experience[],
  selectedId: ExperienceId,
  currentExperience: PlayheadPayload,
): Experience[] {
  const payload = experiencePayloadFromPlayhead(currentExperience);
  return experiences.map((experience) =>
    experience.id === selectedId ? { ...experience, payload } : experience,
  );
}
