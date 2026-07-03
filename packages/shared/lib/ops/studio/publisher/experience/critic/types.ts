import type { ExhibitId } from "@/lib/ops/studio/director/exhibit-plan";

export const EXPERIENCE_CRITIC_AREAS = [
  "opening",
  "rhythm",
  "visualVariety",
  "emotionalArc",
  "closing",
] as const;

export type ExperienceCriticAreaId = (typeof EXPERIENCE_CRITIC_AREAS)[number];

export type ExperienceCriticTone = "note" | "praise" | "concern";

export type ExperienceCriticObservation = {
  id: string;
  area: ExperienceCriticAreaId;
  text: string;
  exhibitId?: ExhibitId;
  tone: ExperienceCriticTone;
};

export type ExperienceCriticReport = {
  computedAt: string;
  rvtr: string;
  exhibitCount: number;
  /** Museum rooms present in patron walkthrough order. */
  exhibitSequence: string[];
  observations: ExperienceCriticObservation[];
};

export const EXPERIENCE_CRITIC_AREA_LABELS: Record<ExperienceCriticAreaId, string> = {
  opening: "Opening",
  rhythm: "Rhythm",
  visualVariety: "Visual Variety",
  emotionalArc: "Emotional Arc",
  closing: "Closing",
};
