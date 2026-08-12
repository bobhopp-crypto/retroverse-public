import "server-only";

import { pushSelectorStateToPublic } from "@/lib/bobos/presentation/push-public";
import type { PlayheadPayload } from "@/lib/bobos/presentation/types";

import {
  alignSelectedExperiencePayload,
  playheadFromExperience,
} from "./current-experience";
import { getAllExperiences, getExperience } from "./sources";
import { loadSelectorState, setSelectedId } from "./store";
import { pickAvailableId, type Experience, type ExperienceId } from "./types";

export { pickAvailableId };

async function persistSelectedId(id: ExperienceId): Promise<void> {
  const state = await setSelectedId(id);
  await pushSelectorStateToPublic(state).catch(() => undefined);
}

/**
 * Resolve the one current public experience.
 *
 * Returns the exact PlayheadPayload every consumer must render, plus source
 * previews for non-selected cards.
 */
export async function resolveCurrentExperience(now: Date = new Date()): Promise<{
  selectedId: ExperienceId;
  experience: Experience;
  experiences: Experience[];
  currentExperience: PlayheadPayload;
  failedOver: boolean;
}> {
  const resolved = await resolveSelectedExperience(now);
  const currentExperience = playheadFromExperience(resolved.experience, now);
  const experiences = alignSelectedExperiencePayload(
    resolved.experiences,
    resolved.selectedId,
    currentExperience,
  );
  const experience =
    experiences.find((entry) => entry.id === resolved.selectedId) ?? resolved.experience;

  return {
    selectedId: resolved.selectedId,
    experience,
    experiences,
    currentExperience,
    failedOver: resolved.failedOver,
  };
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
  // The operator's click is authoritative. A transient source gap must not
  // silently route the audience back to Program or change the selector.
  const selectedId = state.selectedId;
  const failedOver = false;

  const experience =
    experiences.find((e) => e.id === selectedId) ??
    (await getExperience(selectedId, now));

  return { selectedId, experience, experiences, failedOver };
}

/** Public playhead: exactly the selected experience. */
export async function buildSelectedPlayheadPayload(
  now: Date = new Date(),
): Promise<PlayheadPayload> {
  const { currentExperience } = await resolveCurrentExperience(now);
  return currentExperience;
}

/** Operator selects an experience. Unavailable ids are rejected. */
export async function selectExperience(id: ExperienceId): Promise<{
  ok: boolean;
  selectedId: ExperienceId;
  experience: Experience;
  experiences: Experience[];
  currentExperience: PlayheadPayload;
  error?: string;
}> {
  const now = new Date();
  const experiences = await getAllExperiences(now);
  const target = experiences.find((e) => e.id === id);
  if (!target) {
    const { currentExperience } = await resolveCurrentExperience(now);
    return {
      ok: false,
      selectedId: (await loadSelectorState()).selectedId,
      experience: await getExperience(id, now),
      experiences,
      currentExperience,
      error: "Unknown experience",
    };
  }
  if (!target.available) {
    const { currentExperience } = await resolveCurrentExperience(now);
    return {
      ok: false,
      selectedId: (await loadSelectorState()).selectedId,
      experience: target,
      experiences,
      currentExperience,
      error: `${target.name} is unavailable`,
    };
  }

  await persistSelectedId(id);
  const resolved = await resolveCurrentExperience(now);
  return {
    ok: true,
    selectedId: id,
    experience: resolved.experience,
    experiences: resolved.experiences,
    currentExperience: resolved.currentExperience,
  };
}
