/**
 * Collector 3.0 — department handoff contract ("Ready for Editor").
 */

import { findPerformance } from "./package-archive";
import type { EditorHandoffItem, EditorHandoffStatus, EditorHandoffView } from "./package-contract";
import type { CollectorPackage, CollectorStageResult } from "./types";

function stageHandoffStatus(stage: CollectorStageResult | undefined): EditorHandoffStatus {
  if (!stage) return "Missing";
  if (stage.status === "complete") return "Ready";
  if (stage.status === "partial" || stage.status === "skipped") return "Partial";
  return "Missing";
}

function visualAssetsHandoffStatus(
  pkg: CollectorPackage,
  performanceId: string | null | undefined,
): EditorHandoffStatus {
  const performance = findPerformance(pkg, performanceId);
  if (!performance) return "Missing";
  if (performance.visualAssets.extraction.extractedCount > 0) return "Ready";
  if (performance.visualAssets.extraction.skipped) return "Partial";
  return "Missing";
}

export function buildEditorHandoff(
  pkg: CollectorPackage,
  performanceId?: string | null,
): EditorHandoffView {
  const items: EditorHandoffItem[] = [
    {
      id: "identity",
      label: "Identity",
      status: stageHandoffStatus(pkg.stages?.identity),
    },
    {
      id: "recording",
      label: "Recording",
      status: stageHandoffStatus(pkg.stages?.recording),
    },
    {
      id: "culture",
      label: "Culture",
      status: stageHandoffStatus(pkg.stages?.cultural_context),
    },
    {
      id: "visual_assets",
      label: "Visual Assets",
      status: visualAssetsHandoffStatus(pkg, performanceId),
    },
    {
      id: "relationships",
      label: "Relationships",
      status: stageHandoffStatus(pkg.stages?.relationships),
    },
  ];

  return {
    title: "Ready for Editor",
    items,
  };
}
