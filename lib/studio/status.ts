import type { Rvtr, StudioStage } from "./types";

const RVTR_RE = /^RVTR\d{6}$/;

/** Normalize and validate an RVTR string. Returns null when invalid. */
export function normalizeRvtr(value: string | null | undefined): Rvtr | null {
  const normalized = value?.trim().toUpperCase() ?? "";
  return RVTR_RE.test(normalized) ? normalized : null;
}

export function isValidRvtr(value: string | null | undefined): value is Rvtr {
  return normalizeRvtr(value) !== null;
}

/** Derive Studio Alpha stage from artifact presence flags. */
export function deriveStudioStage(input: {
  hasCollector: boolean;
  hasEditor: boolean;
  hasDirector: boolean;
  renderReady: boolean;
}): StudioStage {
  if (!input.hasCollector) return "not_started";
  if (input.renderReady) return "complete";
  if (input.hasDirector) return "director";
  if (input.hasEditor) return "editor";
  return "collector";
}

const STAGE_LABELS: Record<StudioStage, string> = {
  not_started: "Not Started",
  collector: "Collector",
  editor: "Editor",
  director: "Director",
  complete: "Complete",
};

export function studioStageLabel(stage: StudioStage): string {
  return STAGE_LABELS[stage] ?? "Not Started";
}

/** Map legacy queue status strings to kernel JobStatus where possible. */
export function normalizeJobStatus(
  status: string,
): "queued" | "running" | "paused" | "complete" | "failed" | null {
  switch (status) {
    case "queued":
    case "running":
    case "paused":
    case "complete":
    case "failed":
      return status;
    case "completed":
      return "complete";
    default:
      return null;
  }
}
