import { assessCompilationRisk } from "@/lib/healing/compilation-risk";
import type { RestorationFamilyId } from "@/lib/healing/pattern-types";
import { FAMILY_META } from "@/lib/healing/restoration-families";
import type { HealingApplyPreviousState, HealingAuditEntry } from "@/lib/healing/types";

export type RollbackCauseId =
  | "compilation_contamination"
  | "duplicate_rvtr_confusion"
  | "soundtrack_trap"
  | "anthology_collision"
  | "wrong_album_slot"
  | "curator_correction"
  | "unknown";

const ROLLBACK_CAUSE_LABELS: Record<RollbackCauseId, { label: string; note: string }> = {
  compilation_contamination: {
    label: "Compilation contamination",
    note: "Greatest Hits / anthology link poisoned era or artist graph.",
  },
  duplicate_rvtr_confusion: {
    label: "Duplicate RVTR confusion",
    note: "Heal applied to non-canonical variant or conflicting identity.",
  },
  soundtrack_trap: {
    label: "Soundtrack trap",
    note: "OST link mismatched chart artist intent.",
  },
  anthology_collision: {
    label: "Anthology collision",
    note: "Weak join on multi-artist collection slot.",
  },
  wrong_album_slot: {
    label: "Wrong album slot",
    note: "Tracklist position or sequence title did not match curator intent.",
  },
  curator_correction: {
    label: "Curator correction",
    note: "Manual rollback without automated cause signal.",
  },
  unknown: {
    label: "Unknown rollback",
    note: "Insufficient audit context — review JSONL entry.",
  },
};

export function inferRestorationFamilyFromApply(
  apply: HealingAuditEntry,
  albumTitle: string,
  albumArtist: string,
  before: HealingApplyPreviousState,
): RestorationFamilyId {
  const compilation = assessCompilationRisk(albumTitle, albumArtist);
  const reasons = apply.reasons ?? [];
  const conf = apply.confidence ?? 0;

  if (reasons.some((r) => r.includes("duplicate") || r.includes("cluster"))) {
    return "duplicate_ingest_family";
  }
  if (compilation.signals.some((s) => s === "soundtrack" || s === "original_cast")) {
    return "soundtrack_candidate_trap";
  }
  if (compilation.level === "high" || compilation.level === "low") {
    return conf < 0.55 ? "anthology_weak_join" : "compilation_poisoned";
  }
  if (before.albumLinkCount === 0 && reasons.includes("canonical_track_album_link_bridge")) {
    return "high_confidence_studio_match";
  }
  if (conf >= 0.65 && reasons.includes("album_tracklist_title_matches")) {
    return "high_confidence_studio_match";
  }
  if (before.albumLinkCount === 0 && !before.hasCanonicalCover && conf >= 0.45) {
    return "cover_critical_chart_gap";
  }
  return "general_degraded";
}

export function inferRollbackCauses(
  apply: HealingAuditEntry | null,
  albumTitle: string,
  albumArtist: string,
): RollbackCauseId[] {
  if (!apply) return ["unknown"];

  const causes: RollbackCauseId[] = [];
  const compilation = assessCompilationRisk(albumTitle, albumArtist);
  const reasons = apply.reasons ?? [];

  if (compilation.level !== "none") causes.push("compilation_contamination");
  if (compilation.signals.some((s) => s === "soundtrack" || s === "original_cast")) {
    causes.push("soundtrack_trap");
  }
  if (compilation.level === "low" || reasons.some((r) => r.includes("compilation"))) {
    causes.push("anthology_collision");
  }
  if (reasons.some((r) => r.includes("duplicate") || r.includes("cluster"))) {
    causes.push("duplicate_rvtr_confusion");
  }
  if (
    reasons.some((r) => r.includes("slot") || r.includes("position")) ||
    apply.message.toLowerCase().includes("slot")
  ) {
    causes.push("wrong_album_slot");
  }

  if (causes.length === 0) causes.push("curator_correction");
  return [...new Set(causes)];
}

export function rollbackCauseLabel(id: RollbackCauseId): { label: string; note: string } {
  return ROLLBACK_CAUSE_LABELS[id];
}

export function familyDisplayName(id: RestorationFamilyId): string {
  return FAMILY_META[id].name;
}
