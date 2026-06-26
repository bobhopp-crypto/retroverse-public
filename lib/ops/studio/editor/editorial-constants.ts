/**
 * Editor 2.1 — client-safe editorial constants and helpers.
 */

import type {
  CandidateFactReview,
  CandidateFactStatus,
  EditorStoryPackage,
  ImageBoardRole,
  StoryAngleId,
} from "./types";

export const EDITOR_TABS = [
  "overview",
  "story",
  "facts",
  "timeline",
  "cards",
  "images",
  "performances",
  "sources",
  "handoff",
] as const;

export type EditorTabId = (typeof EDITOR_TABS)[number];

export const STORY_ANGLES: Array<{ id: StoryAngleId; label: string }> = [
  { id: "breakthrough", label: "Breakthrough" },
  { id: "personal_story", label: "Personal Story" },
  { id: "cultural_moment", label: "Cultural Moment" },
  { id: "technical_innovation", label: "Technical Innovation" },
  { id: "live_performance", label: "Live Performance" },
  { id: "career_turning_point", label: "Career Turning Point" },
  { id: "behind_the_scenes", label: "Behind the Scenes" },
  { id: "unexpected_connection", label: "Unexpected Connection" },
  { id: "custom", label: "Custom…" },
];

export const IMAGE_BOARD_ROLES: ImageBoardRole[] = [
  "hero",
  "supporting",
  "performance",
  "close-up",
  "alternate",
];

export function storyAngleLabel(
  angle: StoryAngleId,
  custom: string | null | undefined,
): string {
  if (angle === "custom" && custom?.trim()) return custom.trim();
  return STORY_ANGLES.find((a) => a.id === angle)?.label ?? "Unset";
}

export function acceptedFacts(story: EditorStoryPackage): CandidateFactReview[] {
  return story.workspace.candidateFacts.filter((f) => f.status === "accepted");
}

export function pendingFacts(story: EditorStoryPackage): CandidateFactReview[] {
  return story.workspace.candidateFacts.filter((f) => f.status === "pending");
}

export function factStatusSymbol(status: CandidateFactStatus): string {
  if (status === "accepted") return "✓";
  if (status === "rejected") return "✗";
  if (status === "hold") return "◐";
  return "○";
}

export function approvedCardCount(story: EditorStoryPackage): number {
  return story.workspace.plannedCards.filter((c) => c.approved && !c.hidden).length;
}

export function approvedImageCount(story: EditorStoryPackage): number {
  return story.workspace.imageBoard.filter((i) => i.approved).length;
}

export function readyForDirector(story: EditorStoryPackage): boolean {
  const c = story.meta.directorHandoff.checklist;
  return c.story && c.facts && c.cards && c.images && c.performance;
}

export function editorialConfidenceLabel(story: EditorStoryPackage): string {
  const cc = story.meta.collectorConfidence;
  if (cc) {
    if (cc.overall >= 80) return "Strong";
    if (cc.overall >= 65) return "Good";
    if (cc.overall >= 50) return "Moderate";
    if (cc.overall >= 35) return "Developing";
    return "Early";
  }
  const status = story.meta.editorialStatus;
  if (status === "ready" || status === "submitted") return "Ready";
  if (status === "in_progress") return "In Progress";
  if (status === "distilling") return "Distilling";
  return "Not Started";
}
