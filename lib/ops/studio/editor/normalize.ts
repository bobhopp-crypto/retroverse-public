/**
 * Editor 2.1 — ensure workspace fields exist on loaded packages.
 */

import type {
  CandidateFactReview,
  EditorStoryPackage,
  ImageBoardItem,
  PlannedCard,
  StoryAngleId,
} from "./types";
import { modelListItemId } from "@/lib/ops/studio/model-identity";

export function emptyEditor21Workspace(): Pick<
  EditorStoryPackage["workspace"],
  "candidateFacts" | "plannedCards" | "imageBoard"
> {
  return {
    candidateFacts: [],
    plannedCards: [],
    imageBoard: [],
  };
}

/** Backfill 2.1 fields from legacy v2 data without losing edits. */
export function ensureEditor21Fields(story: EditorStoryPackage): EditorStoryPackage {
  const candidateFacts: CandidateFactReview[] =
    story.workspace.candidateFacts?.length > 0
      ? story.workspace.candidateFacts
      : story.approved.facts.map((f) => ({
          id: f.id,
          text: f.text,
          sourceRef: f.sourceRef,
          category: "general",
          status: "accepted" as const,
        }));

  const plannedCards: PlannedCard[] =
    story.workspace.plannedCards?.length > 0
      ? story.workspace.plannedCards
      : [
          ...story.approved.cards.map((c, i) => ({
            id: c.id,
            title: c.title,
            body: c.body,
            approved: true,
            hidden: false,
            priority: 1,
            order: i,
          })),
          ...story.workspace.storyIdeas.cards
            .filter((c) => c.status === "suggested")
            .map((c, i) => ({
              id: c.id,
              title: c.title,
              body: c.body,
              approved: false,
              hidden: false,
              priority: 0,
              order: story.approved.cards.length + i,
            })),
        ];

  const imageBoard: ImageBoardItem[] =
    story.workspace.imageBoard?.length > 0
      ? story.workspace.imageBoard
      : story.approved.images.map((img, i) => ({
          assetId: img.assetId,
          imageUrl: img.imageUrl,
          caption: img.caption,
          label: img.caption || "Image",
          role: i === 0 ? "hero" : "supporting",
          order: i,
          approved: true,
          performanceId: img.performanceId,
        }));

  const storyAngle: StoryAngleId = story.meta.storyAngle ?? "cultural_moment";

  return {
    ...story,
    workspace: {
      ...story.workspace,
      candidateFacts,
      plannedCards,
      imageBoard,
      evidence: {
        ...story.workspace.evidence,
        timeline: story.workspace.evidence.timeline.map((event, sequence) => ({
          ...event,
          id:
            event.id ??
            modelListItemId(
              `${story.meta.rvtr}-timeline`,
              sequence,
              `${event.date}-${event.label}`,
            ),
        })),
      },
    },
    meta: {
      ...story.meta,
      storyAngle,
      storyAngleCustom: story.meta.storyAngleCustom ?? null,
      lastRewriteAt: story.meta.lastRewriteAt ?? null,
      storyManuallyEdited: story.meta.storyManuallyEdited ?? false,
    },
  };
}

export function syncApprovedFromWorkspace(story: EditorStoryPackage): EditorStoryPackage {
  const accepted = story.workspace.candidateFacts.filter((f) => f.status === "accepted");
  const approvedCards = story.workspace.plannedCards
    .filter((c) => c.approved && !c.hidden)
    .sort((a, b) => a.order - b.order)
    .map((c) => ({
      id: c.id,
      title: c.title,
      body: c.body,
      cardType: "story",
    }));

  const approvedImages = story.workspace.imageBoard
    .filter((i) => i.approved)
    .sort((a, b) => a.order - b.order)
    .map((i) => ({
      assetId: i.assetId,
      caption: i.caption,
      imageUrl: i.imageUrl,
      performanceId: i.performanceId,
    }));

  return {
    ...story,
    approved: {
      ...story.approved,
      facts: accepted.map((f) => ({
        id: f.id,
        text: f.text,
        sourceRef: f.sourceRef,
      })),
      cards: approvedCards,
      images: approvedImages,
    },
  };
}
