/**
 * Experience Selector — one selected id. Four identical experiences.
 * The selector never contains Program / VirtualDJ / Announcement / Giveaway logic.
 */

import type { CurrentBroadcast } from "@/lib/broadcast/current-broadcast";
import type { Rvba } from "@/lib/broadcast/rvba";
import type { PlayheadPayloadCore, PresentationQueue } from "@/lib/bobos/presentation/types";

export const EXPERIENCE_IDS = [
  "program",
  "virtualdj",
  "announcement",
  "giveaway",
] as const;

export type ExperienceId = (typeof EXPERIENCE_IDS)[number];

export const EXPERIENCE_NAMES: Record<ExperienceId, string> = {
  program: "Program",
  virtualdj: "VirtualDJ",
  announcement: "Announcement",
  giveaway: "Giveaway",
};

/** Failover order when the selected experience becomes unavailable. */
export const EXPERIENCE_PRIORITY: ExperienceId[] = [
  "program",
  "virtualdj",
  "announcement",
  "giveaway",
];

/** The only object the website knows how to show. */
export type Experience = {
  id: ExperienceId;
  name: string;
  available: boolean;
  payload: {
    rvba: Rvba | null;
    broadcast: CurrentBroadcast | null;
  };
  /** Canonical runtime state for this source, preserved through selection. */
  playhead?: PlayheadPayloadCore;
  /** Operator workspace data; the public player never needs this. */
  queue?: PresentationQueue | null;
};

/** Entire selector store. */
export type SelectorState = {
  selectedId: ExperienceId;
};

export function isExperienceId(value: unknown): value is ExperienceId {
  return typeof value === "string" && (EXPERIENCE_IDS as readonly string[]).includes(value);
}

/** Highest-priority available experience, preferring the current selection. */
export function pickAvailableId(
  experiences: Experience[],
  preferred: ExperienceId,
): ExperienceId | null {
  const byId = new Map(experiences.map((e) => [e.id, e]));
  const preferredExp = byId.get(preferred);
  if (preferredExp?.available) return preferred;

  for (const id of EXPERIENCE_PRIORITY) {
    if (byId.get(id)?.available) return id;
  }
  return null;
}
