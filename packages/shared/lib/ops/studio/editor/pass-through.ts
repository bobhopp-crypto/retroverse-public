import "server-only";

import { findPerformance } from "@/lib/ops/studio/collector/package-archive";
import type { CollectorPackage } from "@/lib/ops/studio/collector/package-contract";
import { visualAssetUrl } from "@/lib/ops/studio/collector/visual-asset-url";

import { buildRetrographFromCollector } from "@/lib/ops/studio/retrograph/build-retrograph";
import { saveRetrograph } from "@/lib/ops/studio/retrograph/store";

import { buildDirectorHandoffFromEditor } from "./director-package";
import { syncApprovedFromWorkspace } from "./normalize";
import { saveEditorStory } from "./store";
import { saveDirectorHandoff } from "@/lib/ops/studio/director/store";
import type { EditorStoryPackage } from "./types";

export type EditorPassThroughAssessment = {
  fatal: string[];
  warnings: string[];
  ready: boolean;
};

/** Fatal issues that must stop the pipeline. */
export function assessEditorFatalIssues(
  collector: CollectorPackage | null,
  story: EditorStoryPackage | null,
): string[] {
  const fatal: string[] = [];
  const rvtr = story?.meta.rvtr?.trim().toUpperCase() ?? collector?.rvtr?.trim().toUpperCase();
  if (!rvtr || !/^RVTR\d{6}$/.test(rvtr)) fatal.push("invalid_rvtr");
  if (!collector) fatal.push("no_collector_package");
  if (!story) fatal.push("no_editor_package");
  if (!collector || !story) return fatal;

  const artist = collector.artist?.trim();
  const title = collector.title?.trim();
  if (!artist || !title) fatal.push("missing_identity");

  const hasFact =
    story.workspace.candidateFacts.some((f) => f.status === "accepted") ||
    story.approved.facts.length > 0 ||
    collector.candidateFacts.some((f) => f.approvalStatus === "approved");

  const hasImage =
    story.workspace.imageBoard.some((i) => i.approved) ||
    story.approved.images.length > 0 ||
    Boolean(collector.visualAssets?.coverUrl) ||
    (collector.visualAssets?.extraction?.extractedCount ?? 0) > 0;

  const hasPerformance =
    Boolean(story.approved.performanceId) ||
    (collector.performances?.length ?? 0) > 0;

  if (!hasFact && !collector.charts?.peakHot100 && !collector.song?.coverUrl) {
    fatal.push("no_usable_source_data");
  }
  if (!hasImage && !collector.visualAssets?.coverUrl) {
    fatal.push("no_usable_visual");
  }
  if (!hasPerformance && !hasImage) {
    fatal.push("no_performance_or_visual_fallback");
  }

  return fatal;
}

/** Non-fatal gaps — pass through with warnings. */
export function assessEditorPassThroughWarnings(
  collector: CollectorPackage,
  story: EditorStoryPackage,
): string[] {
  const warnings: string[] = [];
  const synced = syncApprovedFromWorkspace(story);

  if (synced.approved.cards.length === 0) {
    warnings.push("no_planned_cards");
  }
  if (synced.approved.facts.length === 0) {
    warnings.push("no_accepted_facts");
  }
  if (synced.approved.images.length === 0) {
    warnings.push("no_approved_images");
  }
  if (!synced.approved.performanceId) {
    warnings.push("no_selected_performance");
  }
  if (!story.story.headline.trim() || !story.story.hook.trim()) {
    warnings.push("thin_story_headline_or_hook");
  }
  if (collector.charts?.peakHot100 == null && collector.recording.notes.length === 0) {
    warnings.push("limited_chart_or_recording_metadata");
  }
  return warnings;
}

export function assessEditorPassThrough(
  collector: CollectorPackage | null,
  story: EditorStoryPackage | null,
): EditorPassThroughAssessment {
  const fatal = assessEditorFatalIssues(collector, story);
  if (fatal.length > 0 || !collector || !story) {
    return { fatal, warnings: [], ready: false };
  }
  const warnings = assessEditorPassThroughWarnings(collector, story);
  return { fatal: [], warnings, ready: true };
}

function ensurePerformanceSelected(
  story: EditorStoryPackage,
  collector: CollectorPackage,
): EditorStoryPackage {
  if (story.approved.performanceId) return story;

  const recommended = Object.values(story.workspace.performances).find((p) => p.recommended);
  const perfId =
    recommended?.performanceId ??
    collector.performances?.[0]?.id ??
    null;
  if (!perfId) return story;

  return {
    ...story,
    approved: { ...story.approved, performanceId: perfId },
    workspace: {
      ...story.workspace,
      performances: {
        ...story.workspace.performances,
        [perfId]: {
          ...(story.workspace.performances[perfId] ?? {
            performanceId: perfId,
            venue: "",
            year: null,
            notes: "",
            observations: [],
            screenshots: [],
            recommended: true,
            recommendReason: "Auto-selected for production pass-through",
          }),
          recommended: true,
        },
      },
    },
  };
}

function ensureApprovedImages(
  story: EditorStoryPackage,
  collector: CollectorPackage,
): EditorStoryPackage {
  let next = story;
  const hasApproved = next.workspace.imageBoard.some((i) => i.approved);
  if (hasApproved || next.approved.images.length > 0) return next;

  const perfId = next.approved.performanceId ?? collector.performances?.[0]?.id ?? null;
  const perf = perfId ? findPerformance(collector, perfId) : null;
  const assets = perf?.visualAssets?.extraction?.assets ?? [];
  const hero = assets.find((a) => a.category === "Hero") ?? assets[0];
  const cover = collector.visualAssets?.coverUrl ?? collector.song?.coverUrl;

  const board = [...next.workspace.imageBoard];
  if (hero) {
    board.push({
      assetId: hero.id ?? `frame-${hero.filename}`,
      imageUrl: visualAssetUrl(collector.rvtr, hero.filename),
      caption: hero.category ?? "Performance frame",
      label: hero.category ?? "Performance",
      role: "hero",
      order: board.length,
      approved: true,
      performanceId: perfId,
    });
  } else if (cover) {
    board.push({
      assetId: `cover-${collector.rvtr}`,
      imageUrl: cover,
      caption: "Cover artwork",
      label: "Cover",
      role: "hero",
      order: board.length,
      approved: true,
      performanceId: perfId,
    });
  }

  next = { ...next, workspace: { ...next.workspace, imageBoard: board } };
  return syncApprovedFromWorkspace(next);
}

/** Auto-sync, fill gaps, submit to Director — non-fatal warnings only. */
export async function runEditorPassThrough(input: {
  collector: CollectorPackage;
  story: EditorStoryPackage;
  notes?: string;
}): Promise<{ story: EditorStoryPackage; warnings: string[]; submitted: boolean }> {
  const assessment = assessEditorPassThrough(input.collector, input.story);
  if (!assessment.ready) {
    throw new Error(assessment.fatal[0] ?? "editor_not_ready");
  }

  let story = syncApprovedFromWorkspace(input.story);
  story = ensurePerformanceSelected(story, input.collector);
  story = ensureApprovedImages(story, input.collector);
  story = syncApprovedFromWorkspace(story);

  const alreadySubmitted = story.meta.editorialStatus === "submitted";
  if (!alreadySubmitted) {
    story = {
      ...story,
      meta: {
        ...story.meta,
        editorialStatus: "submitted",
        directorHandoff: {
          ...story.meta.directorHandoff,
          submittedAt: new Date().toISOString(),
          notes: (() => {
            const merged = [
              input.notes ?? story.meta.directorHandoff.notes,
              assessment.warnings.length
                ? `Pass-through warnings: ${assessment.warnings.join(", ")}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return merged || story.meta.directorHandoff.notes || "";
          })(),
        },
      },
    };
    await saveEditorStory(story);
  }

  await saveRetrograph(buildRetrographFromCollector(input.collector, story));
  const handoff = buildDirectorHandoffFromEditor(story);
  await saveDirectorHandoff(handoff);

  return {
    story,
    warnings: assessment.warnings,
    submitted: !alreadySubmitted,
  };
}
