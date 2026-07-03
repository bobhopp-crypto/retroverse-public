import type {
  Rvtr,
  StudioConfidenceLabel,
  StudioNeedFlags,
  StudioStage,
  StudioStoryStatus,
} from "./types";

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

/** Patron or research quality score → display label. */
export function studioConfidenceLabel(score: number | null): StudioConfidenceLabel {
  if (score === null) return "Early";
  if (score >= 8) return "Strong";
  if (score >= 6.5) return "Good";
  if (score >= 5) return "Developing";
  return "Early";
}

export type StudioEditorialStatusInput = {
  hasEditor: boolean;
  editorialStatus: string | null | undefined;
  storyQuality: string | null | undefined;
  patronValue: number | null;
};

/** Editor editorial checkpoint → story readiness label. */
export function storyStatusFromEditorial(input: StudioEditorialStatusInput): StudioStoryStatus {
  if (!input.hasEditor) return "None";
  const status = input.editorialStatus;
  const sq = input.storyQuality?.toLowerCase() ?? "";
  if (status === "submitted" || status === "ready") {
    if (input.patronValue !== null && input.patronValue < 6) return "Weak";
    if (sq === "weak" || sq === "fair") return "Weak";
    return "Ready";
  }
  if (status === "in_progress" || status === "distilling") return "Needs Review";
  return "None";
}

/** Director render spec readiness values that count as publish-ready. */
export function isStudioRenderReady(renderReadiness: string | null | undefined): boolean {
  return (
    renderReadiness === "ready_to_render" || renderReadiness === "missing_optional_assets"
  );
}

export type StudioNeedFlagsInput = {
  hasCollector: boolean;
  hasEditor: boolean;
  hasDirector: boolean;
  renderReady: boolean;
  directorHandoffStatus: string | null | undefined;
};

/** Department queue flags for a single RVTR. */
export function deriveStudioNeedFlags(input: StudioNeedFlagsInput): StudioNeedFlags {
  return {
    needsCollector: !input.hasCollector,
    needsEditor: input.hasCollector && !input.hasEditor,
    needsDirector:
      input.hasEditor && input.directorHandoffStatus === "submitted" && !input.hasDirector,
    readyToPublish: input.renderReady,
  };
}

export type StudioMissingItemsInput = {
  hasCollector: boolean;
  researchQuality: number | null;
  hasEditor: boolean;
  directorHandoffStatus: string | null | undefined;
  hasDirector: boolean;
  directorMissingAssets: string[];
  maxItems?: number;
};

/** Human-readable gaps blocking Studio Alpha completion. */
export function buildStudioMissingItems(input: StudioMissingItemsInput): string[] {
  const cap = input.maxItems ?? 8;
  const missing: string[] = [];
  if (!input.hasCollector) missing.push("Collector package");
  if (input.hasCollector && (input.researchQuality ?? 0) < 60) missing.push("Research depth");
  if (!input.hasEditor) missing.push("Editor story");
  else if (input.directorHandoffStatus !== "submitted") missing.push("Director handoff");
  if (!input.hasDirector) missing.push("Director plan");
  else {
    for (const item of input.directorMissingAssets) {
      if (missing.length >= 6) break;
      missing.push(item);
    }
  }
  return missing.slice(0, cap);
}

/** Default need flags for an RVTR with no Studio Alpha artifacts loaded. */
export function defaultStudioNeedFlags(): StudioNeedFlags {
  return {
    needsCollector: true,
    needsEditor: false,
    needsDirector: false,
    readyToPublish: false,
  };
}

/** Default missing-item list when no packages exist. */
export function defaultStudioMissingItems(hasRvtr: boolean): string[] {
  return hasRvtr ? ["Collector package"] : ["RVTR identity"];
}
