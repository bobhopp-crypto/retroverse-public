import "server-only";

import { access } from "fs/promises";
import { join } from "path";

import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import { loadDirectorHandoff, loadDirectorPackage } from "@/lib/ops/studio/director/store";
import { assessEditorFatalIssues } from "@/lib/ops/studio/editor/pass-through";
import { loadEditorStory } from "@/lib/ops/studio/editor/store";
import { collectorVisualAssetsDir } from "@/lib/studio/package";
import { normalizeRvtr } from "@/lib/studio/status";

import { goldenStatusForRvtr } from "./experience/golden";
import { getPublisherRecord, upsertPublisherRecord } from "./store";
import type { PublicationClass, PublisherRecord } from "./types";

/** Minimum quality score for unattended Standard approval (Sprint 3.6+). */
export const PUBLISH_SCORE_AUTO_THRESHOLD = 70;

/** Score ≥ 80 — publish without review flag. */
export const PUBLISH_SCORE_HIGH = 80;

/** Score ≥ 70 — publish; 70–79 flagged advisory only. */
export const PUBLISH_SCORE_REVIEW_MIN = 70;

/** Below this score is advisory only — does not block when structure is complete. */
export const PUBLISH_SCORE_REJECT_BELOW = 70;

export type PublishScoreTier = "publish" | "needs_review" | "reject_advisory";

export function scoreTierForQuality(qualityScore: number): PublishScoreTier {
  if (qualityScore >= PUBLISH_SCORE_HIGH) return "publish";
  if (qualityScore >= PUBLISH_SCORE_REVIEW_MIN) return "needs_review";
  return "reject_advisory";
}

export function scoreTierLabel(tier: PublishScoreTier): string {
  switch (tier) {
    case "publish":
      return "Passed automatic threshold";
    case "needs_review":
      return "Published — quality review recommended (70–79)";
    case "reject_advisory":
      return "Published — below quality target (coaching advisory only)";
  }
}

const FATAL_LABELS: Record<string, string> = {
  invalid_rvtr: "Invalid RVTR identity",
  no_collector_package: "Missing Collector package",
  no_editor_package: "Missing Editor package",
  missing_identity: "Missing artist or title identity",
  no_usable_source_data: "Missing required research",
  no_usable_visual: "No usable artwork",
  no_performance_or_visual_fallback: "No performance or visual fallback",
  editor_not_submitted: "Editor not submitted to Director",
  missing_director_render_spec: "Director render spec missing",
  no_approved_facts: "No approved facts",
  no_approved_images: "No approved images",
  no_approved_performance: "No approved performance",
  missing_hero_artwork: "Missing hero artwork",
  corrupted_package: "Package failed validation",
  conflicting_identity: "Conflicting identity across departments",
  unrecoverable_render: "Unrecoverable render failure",
  golden_frozen: "Golden package — manual only",
  no_evaluation: "Publisher evaluation missing",
  already_approved: "Already published",
};

export function formatFatalReason(code: string): string {
  return FATAL_LABELS[code] ?? code.replace(/_/g, " ");
}

export type StructuralPublishAssessment = {
  fatals: string[];
  fatalCodes: string[];
  advisories: string[];
  structurallyComplete: boolean;
};

async function hasVisualAssetFile(rvtr: string, name: string): Promise<boolean> {
  try {
    await access(join(collectorVisualAssetsDir(rvtr), name));
    return true;
  } catch {
    return false;
  }
}

/** True blocking conditions only — coaching and quality scores are advisory. */
export async function assessStructuralPublishReadiness(
  rvtr: string,
): Promise<StructuralPublishAssessment> {
  const normalized = normalizeRvtr(rvtr);
  const fatalCodes: string[] = [];
  const advisories: string[] = [];

  if (!normalized) {
    return {
      fatals: [formatFatalReason("invalid_rvtr")],
      fatalCodes: ["invalid_rvtr"],
      advisories: [],
      structurallyComplete: false,
    };
  }

  const [collector, editor, director, handoff] = await Promise.all([
    loadCollectorPackage(normalized),
    loadEditorStory(normalized),
    loadDirectorPackage(normalized),
    loadDirectorHandoff(normalized),
  ]);

  for (const code of assessEditorFatalIssues(collector, editor)) {
    fatalCodes.push(code);
  }

  if (editor && editor.meta.editorialStatus !== "submitted") {
    fatalCodes.push("editor_not_submitted");
  }

  if (!director?.renderSpec) {
    fatalCodes.push("missing_director_render_spec");
  }

  const facts =
    handoff?.approvedFacts.length ??
    editor?.approved.facts.length ??
    collector?.candidateFacts.filter((f) => f.approvalStatus === "approved").length ??
    0;
  if (facts === 0) {
    fatalCodes.push("no_approved_facts");
  }

  const images =
    handoff?.approvedImages.length ??
    editor?.approved.images.length ??
    0;
  const hasCover = Boolean(collector?.visualAssets?.coverUrl ?? collector?.song?.coverUrl);
  if (images === 0 && !hasCover) {
    fatalCodes.push("no_approved_images");
  }

  const hasPerformance =
    Boolean(handoff?.performance.id) ||
    (handoff?.performance.screenshots.length ?? 0) > 0 ||
    Boolean(editor?.approved.performanceId) ||
    (collector?.performances?.length ?? 0) > 0;
  if (!hasPerformance && images === 0 && !hasCover) {
    fatalCodes.push("no_approved_performance");
  }

  const heroFrame = await hasVisualAssetFile(normalized, "hero.jpg");
  const perfFrame = await hasVisualAssetFile(normalized, "performance.jpg");
  if (!heroFrame && !perfFrame && !hasCover && images === 0) {
    fatalCodes.push("missing_hero_artwork");
  }

  if (director?.review.renderReadiness === "missing_required_assets") {
    const minimumSceneAssets =
      (director.experiencePlan.scenes.length ?? 0) >= 3 &&
      facts > 0 &&
      (images > 0 || hasCover) &&
      hasPerformance;
    if (!minimumSceneAssets) {
      fatalCodes.push("unrecoverable_render");
    } else {
      advisories.push("Director optional asset gaps — published anyway");
    }
  }

  const uniqueFatals = [...new Set(fatalCodes)];
  return {
    fatals: uniqueFatals.map(formatFatalReason),
    fatalCodes: uniqueFatals,
    advisories,
    structurallyComplete: uniqueFatals.length === 0,
  };
}

export type AutoPublishResult =
  | {
      action: "publish";
      publicationClass: PublicationClass;
      reason: string;
      advisories: string[];
      record: PublisherRecord;
    }
  | { action: "skip"; reason: string; fatalCodes: string[]; advisories: string[] };

/**
 * Automatic Standard publishing — structural completeness only.
 * Coaching observations and quality scores are stored but never block.
 */
export async function autoPublishStandard(rvtr: string): Promise<AutoPublishResult> {
  const normalized = normalizeRvtr(rvtr);
  if (!normalized) {
    return { action: "skip", reason: formatFatalReason("invalid_rvtr"), fatalCodes: ["invalid_rvtr"], advisories: [] };
  }

  const record = await getPublisherRecord(normalized);
  if (!record?.evaluation) {
    return { action: "skip", reason: formatFatalReason("no_evaluation"), fatalCodes: ["no_evaluation"], advisories: [] };
  }

  const golden = await goldenStatusForRvtr(normalized);
  if (golden.isGolden) {
    return { action: "skip", reason: formatFatalReason("golden_frozen"), fatalCodes: ["golden_frozen"], advisories: [] };
  }

  if (record.approvedClass) {
    return { action: "skip", reason: formatFatalReason("already_approved"), fatalCodes: ["already_approved"], advisories: [] };
  }

  const structural = await assessStructuralPublishReadiness(normalized);
  const eval_ = record.evaluation;
  const advisories = [
    ...structural.advisories,
    ...eval_.coachingIssues.map((c) => `Coaching: ${c}`),
  ];

  if (!structural.structurallyComplete) {
    const primary = structural.fatals[0] ?? "Package incomplete";
    return {
      action: "skip",
      reason: primary,
      fatalCodes: structural.fatalCodes,
      advisories,
    };
  }

  const tier = scoreTierForQuality(eval_.qualityScore);
  const tierNote = scoreTierLabel(tier);
  const now = new Date().toISOString();

  const next: PublisherRecord = {
    ...record,
    approvedClass: "ready",
    approvedAt: now,
    publishedAt: now,
    decisions: [
      ...record.decisions,
      {
        action: "approve",
        publicationClass: "ready",
        reviewer: "production-pass-through",
        reason: `${tierNote} (score ${eval_.qualityScore})`,
        previousClass: eval_.publicationClass,
        decidedAt: now,
      },
    ],
  };

  await upsertPublisherRecord(next);
  return {
    action: "publish",
    publicationClass: "ready",
    reason: tierNote,
    advisories,
    record: next,
  };
}

/** @deprecated Use autoPublishStandard — kept for imports. */
export async function autoApproveStandardIfEligible(rvtr: string): Promise<
  | { approved: false; reason: string }
  | { approved: true; publicationClass: PublicationClass; record: PublisherRecord }
> {
  const result = await autoPublishStandard(rvtr);
  if (result.action === "skip") {
    return { approved: false, reason: result.fatalCodes[0] ?? result.reason };
  }
  return {
    approved: true,
    publicationClass: result.publicationClass,
    record: result.record,
  };
}

export const STANDARD_AUTO_APPROVE_MIN_SCORE = PUBLISH_SCORE_AUTO_THRESHOLD;
