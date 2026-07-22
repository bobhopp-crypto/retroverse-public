import "server-only";

import { normalizePlayheadPayload } from "@/lib/broadcast/normalize-playhead";
import type { PlayheadPayload, PlayheadPayloadCore } from "@/lib/bobos/presentation/types";

import { getAllExperiences, getExperience } from "./sources";
import { loadSelectorState, setSelectedId } from "./store";
import { pickAvailableId, type Experience, type ExperienceId } from "./types";

export { pickAvailableId };

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

/** Build a playhead payload from a common Experience (website contract). */
export function playheadFromExperience(experience: Experience, now: Date = new Date()): PlayheadPayload {
  const core = emptyCore(now);
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

/**
 * Resolve what retroverse.live should show: selected experience, with failover.
 * May persist a new selectedId when the current one is unavailable.
 */
export async function resolveSelectedExperience(now: Date = new Date()): Promise<{
  selectedId: ExperienceId;
  experience: Experience;
  experiences: Experience[];
  failedOver: boolean;
}> {
  const state = await loadSelectorState();
  const experiences = await getAllExperiences(now);
  const availableId = pickAvailableId(experiences, state.selectedId);

  let selectedId = state.selectedId;
  let failedOver = false;

  if (availableId && availableId !== state.selectedId) {
    const current = experiences.find((e) => e.id === state.selectedId);
    if (!current?.available) {
      await setSelectedId(availableId);
      selectedId = availableId;
      failedOver = true;
    }
  } else if (availableId) {
    selectedId = availableId;
  }

  const experience =
    experiences.find((e) => e.id === selectedId) ??
    (await getExperience(selectedId, now));

  return { selectedId, experience, experiences, failedOver };
}

/** Public playhead: exactly the selected experience. */
export async function buildSelectedPlayheadPayload(
  now: Date = new Date(),
): Promise<PlayheadPayload> {
  const { experience } = await resolveSelectedExperience(now);
  return playheadFromExperience(experience, now);
}

/** Operator selects an experience. Unavailable ids are rejected. */
export async function selectExperience(id: ExperienceId): Promise<{
  ok: boolean;
  selectedId: ExperienceId;
  experience: Experience;
  experiences: Experience[];
  error?: string;
}> {
  const now = new Date();
  const experiences = await getAllExperiences(now);
  const target = experiences.find((e) => e.id === id);
  if (!target) {
    return {
      ok: false,
      selectedId: (await loadSelectorState()).selectedId,
      experience: await getExperience(id, now),
      experiences,
      error: "Unknown experience",
    };
  }
  if (!target.available) {
    return {
      ok: false,
      selectedId: (await loadSelectorState()).selectedId,
      experience: target,
      experiences,
      error: `${target.name} is unavailable`,
    };
  }

  await setSelectedId(id);
  return {
    ok: true,
    selectedId: id,
    experience: target,
    experiences,
  };
}
