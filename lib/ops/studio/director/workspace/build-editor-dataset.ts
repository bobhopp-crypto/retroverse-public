import type { CollectorPackage } from "@/lib/ops/studio/collector/types";
import type { EditorStoryPackage } from "@/lib/ops/studio/editor/types";

import type { EditorFactRow } from "./types";

export function buildEditorDataset(
  editor: EditorStoryPackage | null,
  collector: CollectorPackage | null,
): { facts: EditorFactRow[]; warnings: string[] } {
  if (!editor) {
    return {
      facts: [{ label: "Editor package", value: "Not available" }],
      warnings: ["Editor has not produced a clean dataset yet."],
    };
  }

  const candidateFacts = editor.workspace.candidateFacts ?? [];
  const rejected = candidateFacts.filter((f) => f.status === "rejected");
  const held = candidateFacts.filter((f) => f.status === "hold");
  const accepted = candidateFacts.filter((f) => f.status === "accepted");
  const pending = candidateFacts.filter((f) => f.status === "pending");

  const facts: EditorFactRow[] = [
    { label: "Duplicates removed", value: String(rejected.length) },
    { label: "Conflicts on hold", value: String(held.length) },
    { label: "Facts accepted", value: String(accepted.length) },
    { label: "Facts pending review", value: String(pending.length) },
    { label: "Approved facts (handoff)", value: String(editor.approved.facts.length) },
    { label: "Approved cards", value: String(editor.approved.cards.length) },
    { label: "Approved images", value: String(editor.approved.images.length) },
    { label: "Approved quotes", value: String(editor.approved.quotes.length) },
    {
      label: "Performance selected",
      value: editor.approved.performanceId ?? "None",
    },
    {
      label: "Timeline events (normalized)",
      value: String(editor.workspace.evidence.timeline?.length ?? 0),
    },
    {
      label: "Song timeline (merged)",
      value: String(editor.workspace.evidence.songTimeline?.length ?? 0),
    },
    {
      label: "Recording timeline (merged)",
      value: String(editor.workspace.evidence.recordingTimeline?.length ?? 0),
    },
    {
      label: "Performance timeline (merged)",
      value: String(editor.workspace.evidence.performanceTimeline?.length ?? 0),
    },
    {
      label: "Primary narrative year",
      value: editor.workspace.evidence.canonical?.primaryNarrativeYear
        ? String(editor.workspace.evidence.canonical.primaryNarrativeYear)
        : "Unresolved",
    },
    {
      label: "Editorial status",
      value: editor.meta.editorialStatus,
    },
    {
      label: "Director handoff",
      value: editor.meta.directorHandoff.submittedAt ? "Submitted" : "Not submitted",
    },
  ];

  if (accepted.length > 0) {
    facts.push({
      label: "Sample approved fact",
      value: accepted[0]?.text.slice(0, 120) ?? "",
    });
  }

  const missing = [
    ...editor.workspace.editorialNotes.missing.map((n) => n.text),
    ...(collector?.missingAreas ?? []),
  ].filter(Boolean);

  if (missing.length > 0) {
    facts.push({ label: "Missing information", value: missing.slice(0, 6).join(" · ") });
  }

  const warnings: string[] = [
    ...editor.workspace.editorialNotes.weakAreas.map((n) => n.text),
    ...editor.workspace.editorialNotes.factChecks.map((n) => n.text),
    ...held.map((f) => `Conflict hold: ${f.text.slice(0, 80)}`),
  ].filter(Boolean);

  return { facts, warnings: warnings.slice(0, 12) };
}
