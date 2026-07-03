import "server-only";

import { access } from "fs/promises";

import { collectorOutputPath } from "@/lib/ops/studio/collector/paths";
import { directorRenderSpecPath } from "@/lib/ops/studio/director/paths";
import { editorOutputPath } from "@/lib/ops/studio/editor/paths";
import { loadEditorStory } from "@/lib/ops/studio/editor/store";
import { isPublisherApproved, loadPublisherStore } from "@/lib/ops/studio/publisher/store";
import type { PublisherRecord } from "@/lib/ops/studio/publisher/types";

export type PackageStageContext = {
  publisherByRvtr: Map<string, PublisherRecord>;
};

export type PackagePipelineStage =
  | "missing_collector"
  | "collector_complete"
  | "editor_queued"
  | "editor_complete"
  | "director_queued"
  | "director_complete"
  | "publisher_queued"
  | "publisher_complete"
  | "published";

export type PackageStageAssessment = {
  rvtr: string;
  stage: PackagePipelineStage;
  /** Human-readable queue reason for production selection. */
  reason: string;
  needsRun: boolean;
  hasCollector: boolean;
  hasEditor: boolean;
  editorSubmitted: boolean;
  hasDirector: boolean;
  publisherEvaluated: boolean;
  publisherApproved: boolean;
};

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Per-package pipeline position — single source for queue + diagnostics. */
export async function assessPackagePipelineStage(
  rvtr: string,
  context?: PackageStageContext,
): Promise<PackageStageAssessment> {
  const normalized = rvtr.trim().toUpperCase();
  const hasCollector = await fileExists(collectorOutputPath(normalized));
  const hasEditor = await fileExists(editorOutputPath(normalized));
  const hasDirector = await fileExists(directorRenderSpecPath(normalized));

  const editor = hasEditor ? await loadEditorStory(normalized) : null;
  const editorSubmitted =
    editor?.meta.editorialStatus === "submitted" ||
    Boolean(editor?.meta.directorHandoff?.submittedAt);

  const publisher =
    context?.publisherByRvtr.get(normalized) ??
    (await loadPublisherStore()).records.find((r) => r.rvtr === normalized) ??
    null;
  const publisherEvaluated = Boolean(publisher?.evaluation);
  const publisherApproved = isPublisherApproved(publisher);

  const base = {
    rvtr: normalized,
    hasCollector,
    hasEditor,
    editorSubmitted,
    hasDirector,
    publisherEvaluated,
    publisherApproved,
  };

  if (!hasCollector) {
    return {
      ...base,
      stage: "missing_collector",
      reason: "Collector not started",
      needsRun: true,
    };
  }

  if (!hasEditor) {
    return {
      ...base,
      stage: "editor_queued",
      reason: "Editor queued — awaiting distill",
      needsRun: true,
    };
  }

  if (!editorSubmitted) {
    return {
      ...base,
      stage: "editor_queued",
      reason: "Editor complete — awaiting handoff to Director",
      needsRun: true,
    };
  }

  if (!hasDirector) {
    return {
      ...base,
      stage: "director_queued",
      reason: "Director queued — Editor submitted",
      needsRun: true,
    };
  }

  if (!publisherEvaluated) {
    return {
      ...base,
      stage: "publisher_queued",
      reason: "Publisher queued — Director complete",
      needsRun: true,
    };
  }

  if (!publisherApproved) {
    return {
      ...base,
      stage: "publisher_queued",
      reason: "Publisher evaluated — awaiting publish",
      needsRun: true,
    };
  }

  return {
    ...base,
    stage: "published",
    reason: "Published complete",
    needsRun: false,
  };
}
