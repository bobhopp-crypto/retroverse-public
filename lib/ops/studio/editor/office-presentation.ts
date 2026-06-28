/**
 * Editor 2.1 — client-safe office view model.
 */

import { findPerformance } from "@/lib/ops/studio/collector/package-archive";
import type { CollectorPackage } from "@/lib/ops/studio/collector/package-contract";
import { visualAssetUrl } from "@/lib/ops/studio/collector/visual-asset-url";

import {
  approvedCardCount,
  approvedImageCount,
  editorialConfidenceLabel,
  readyForDirector,
  storyAngleLabel,
} from "./editorial-constants";
import type { EditorialReview, EditorialBrain } from "./types";
import type { EditorStoryPackage } from "./types";
import { identifyStrings, type IdentifiedText } from "@/lib/ops/studio/model-identity";

export type EditorPerformanceReview = {
  id: string;
  title: string;
  venue: string;
  year: number | null;
  confidence: number;
  qualityScore: number;
  recommended: boolean;
  recommendReason: string;
  notes: string;
  observations: string[];
  screenshots: EditorStoryPackage["workspace"]["performances"][string]["screenshots"];
};

export type EditorOfficeDashboard = {
  storyStatus: string;
  storyAngle: string;
  approvedFactsCount: number;
  pendingFactsCount: number;
  acceptedImagesCount: number;
  recommendedPerformance: string | null;
  cardsPlanned: number;
  confidence: string;
  readyForDirector: boolean;
  hookPreview: string;
  editorialReview: EditorialReview | null;
};

export type EditorOfficeEditorialBrain = Omit<EditorialBrain, "directorBrief"> & {
  directorBrief: Omit<EditorialBrain["directorBrief"], "retroverseMoments"> & {
    retroverseMoments: IdentifiedText[];
  };
};

export type EditorOfficeView = {
  rvtr: string;
  artist: string;
  title: string;
  coverUrl: string | null;
  dashboard: EditorOfficeDashboard;
  performances: EditorPerformanceReview[];
  selectedPerformanceId: string | null;
  researchUpdated: boolean;
  lastSaved: string;
  canSubmit: boolean;
  submitted: boolean;
  editorialBrain: EditorOfficeEditorialBrain | null;
};

function presentEditorialBrain(brain: EditorialBrain, rvtr: string): EditorOfficeEditorialBrain {
  return {
    ...brain,
    directorBrief: {
      ...brain.directorBrief,
      retroverseMoments: identifyStrings(`${rvtr}-rv-moment`, brain.directorBrief.retroverseMoments),
    },
  };
}

export function buildEditorOfficeView(
  collector: CollectorPackage,
  story: EditorStoryPackage,
  perfOverride?: string | null,
): EditorOfficeView {
  const perfId = perfOverride ?? story.approved.performanceId;
  const collectorPerf = perfId ? findPerformance(collector, perfId) : null;
  const hero = collectorPerf?.visualAssets.extraction.assets.find((a) => a.category === "Hero");
  const coverUrl =
    collector.song?.coverUrl ??
    collector.visualAssets?.coverUrl ??
    (hero ? visualAssetUrl(collector.rvtr, hero.filename) : null);

  const acceptedFacts = story.workspace.candidateFacts.filter((f) => f.status === "accepted");
  const pendingFacts = story.workspace.candidateFacts.filter((f) => f.status === "pending");
  const recommended = Object.values(story.workspace.performances).find((p) => p.recommended);

  const performances: EditorPerformanceReview[] = (collector.performances ?? []).map((p) => {
    const ws = story.workspace.performances[p.id];
    return {
      id: p.id,
      title: p.title,
      venue: ws?.venue || p.detectedVenue || "",
      year: ws?.year ?? p.detectedYear,
      confidence: p.confidence,
      qualityScore: p.qualityScore,
      recommended: ws?.recommended ?? false,
      recommendReason: ws?.recommendReason ?? "",
      notes: ws?.notes ?? "",
      observations: ws?.observations ?? [],
      screenshots: ws?.screenshots ?? [],
    };
  });

  const status = story.meta.editorialStatus;
  const storyStatus =
    status === "submitted"
      ? "With Director"
      : status === "ready"
        ? "Ready for Director"
        : status === "in_progress"
          ? "In Editorial"
          : "Starting";

  return {
    rvtr: collector.rvtr,
    artist: collector.artist,
    title: collector.title,
    coverUrl,
    dashboard: {
      storyStatus,
      storyAngle: storyAngleLabel(story.meta.storyAngle, story.meta.storyAngleCustom),
      approvedFactsCount: acceptedFacts.length,
      pendingFactsCount: pendingFacts.length,
      acceptedImagesCount: approvedImageCount(story),
      recommendedPerformance: recommended
        ? performances.find((p) => p.id === recommended.performanceId)?.title ?? null
        : null,
      cardsPlanned: approvedCardCount(story),
      confidence: editorialConfidenceLabel(story),
      readyForDirector: readyForDirector(story),
      hookPreview: story.story.hook,
      editorialReview: story.workspace.editorialReview ?? null,
    },
    performances,
    selectedPerformanceId: perfId,
    researchUpdated: story.meta.collectorCompletedAt !== collector.completedAt,
    lastSaved: story.meta.updatedAt,
    canSubmit:
      story.story.headline.trim().length > 0 &&
      story.story.hook.trim().length > 0 &&
      story.meta.editorialStatus !== "submitted",
    submitted: story.meta.editorialStatus === "submitted",
    editorialBrain: story.editorialBrain
      ? presentEditorialBrain(story.editorialBrain, collector.rvtr)
      : null,
  };
}
