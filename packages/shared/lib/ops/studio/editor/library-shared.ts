/**
 * Editor library — client-safe types and helpers.
 * No filesystem, no server modules.
 */

import type {
  EditorConfidenceLevel,
  EditorDirectorHandoffStatus,
  EditorLibraryCard,
} from "./types";

export type {
  EditorLibraryCard,
  EditorLibraryIndex,
  EditorLibraryStats,
} from "./types";

export function filterEditorCards(cards: EditorLibraryCard[], query: string): EditorLibraryCard[] {
  const q = query.trim().toLowerCase();
  if (!q) return cards;
  return cards.filter(
    (c) =>
      c.artist.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.rvtr.toLowerCase().includes(q),
  );
}

export function storyStatusLabel(
  status: EditorDirectorHandoffStatus | "no_draft",
): string {
  switch (status) {
    case "ready":
      return "Ready for Director";
    case "submitted":
      return "With Director";
    case "not_ready":
      return "In Progress";
    default:
      return "Awaiting Editor";
  }
}

export function confidenceLabel(level: EditorConfidenceLevel | null): string {
  if (!level) return "—";
  if (level === "ready") return "Ready";
  if (level === "review") return "In Review";
  return "Draft";
}
