import "server-only";

import { createHash, randomUUID } from "crypto";

import {
  EDITOR_DISTILL_VERSION,
  EDITOR_STORY_VERSION,
  type EditorNote,
  type EditorStoryPackage,
  type EditorStoryPackageV1,
  type PerformanceWorkspace,
  type StoryIdea,
  type TimelineEvent,
} from "./types";

function stableId(prefix: string, seed: string): string {
  const hash = createHash("sha256").update(seed).digest("hex").slice(0, 12);
  return `${prefix}-${hash}`;
}

function parseTimeline(raw: string): TimelineEvent[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      const dash = line.indexOf(" — ");
      if (dash > 0) {
        return { date: line.slice(0, dash).trim(), label: line.slice(dash + 3).trim() };
      }
      return { date: "—", label: line };
    });
}

function linesToNotes(lines: string[], prefix: string): EditorNote[] {
  return lines.map((text, i) => ({
    id: stableId(prefix, `${text}-${i}`),
    text,
  }));
}

function stringListToStoryIdeas(items: string[], kind: StoryIdea["kind"]): StoryIdea[] {
  return items.map((body, i) => ({
    id: stableId("idea", `${kind}-${body}-${i}`),
    kind,
    title: kind === "card" ? "Story Card" : kind === "quote" ? "Quote" : "Visual Moment",
    body,
    status: "suggested" as const,
  }));
}

function mapV1Performance(
  perf: EditorStoryPackageV1["performances"][string],
): PerformanceWorkspace {
  return {
    performanceId: perf.performanceId,
    notes: perf.notes,
    venue: perf.venue,
    year: perf.year,
    observations: perf.facts,
    screenshots: perf.screenshots.map((s) => ({ ...s, approved: false })),
    recommended: false,
    recommendReason: "",
  };
}

function mapConfidenceToStatus(
  confidence: EditorStoryPackageV1["confidence"],
  handoff: EditorStoryPackageV1["directorHandoff"]["status"],
): EditorStoryPackage["meta"]["editorialStatus"] {
  if (handoff === "submitted") return "submitted";
  if (handoff === "ready" || confidence === "ready") return "ready";
  if (confidence === "review" || confidence === "draft") return "in_progress";
  return "in_progress";
}

function looksLikeResearchSummary(summary: string): boolean {
  return /·|No chart history|candidate facts|gaps noted|performance videos/i.test(summary);
}

/**
 * Migrate v1 editor.json to v2, preserving human edits where possible.
 */
export function migrateV1ToV2(v1: EditorStoryPackageV1): EditorStoryPackage {
  const rvtr = v1.rvtr.trim().toUpperCase();
  const hook = looksLikeResearchSummary(v1.summary) ? "" : v1.summary;
  const summary = looksLikeResearchSummary(v1.summary) ? v1.longStory.split("\n\n")[0] ?? "" : v1.summary;

  const performances: Record<string, PerformanceWorkspace> = {};
  for (const [id, perf] of Object.entries(v1.performances ?? {})) {
    performances[id] = mapV1Performance(perf);
    if (v1.selectedPerformanceId === id) {
      performances[id]!.recommended = true;
      performances[id]!.recommendReason = "Previously selected performance";
    }
  }

  const editorialStatus = mapConfidenceToStatus(v1.confidence, v1.directorHandoff.status);

  return {
    story: {
      headline: v1.headline,
      subtitle: "",
      hook: hook || v1.headline,
      summary: summary || v1.headline,
      fullStory: v1.longStory,
    },
    approved: {
      facts: v1.interestingFacts.slice(0, 7).map((text, i) => ({
        id: stableId("fact", `${text}-${i}`),
        text,
        sourceRef: null,
      })),
      cards: v1.suggestedCards.slice(0, 7).map((body, i) => ({
        id: stableId("card", `${body}-${i}`),
        title: "Story Card",
        body,
        cardType: "general",
      })),
      images: [],
      quotes: v1.quoteCandidates.slice(0, 5).map((text, i) => ({
        id: stableId("quote", `${text}-${i}`),
        text,
        attribution: null,
      })),
      performanceId: v1.selectedPerformanceId,
    },
    workspace: {
      storyIdeas: {
        cards: stringListToStoryIdeas(v1.suggestedCards, "card"),
        visualMoments: stringListToStoryIdeas(
          v1.suggestedImages.filter((s) => !s.startsWith("Awaiting")),
          "visual",
        ),
        quotes: stringListToStoryIdeas(v1.quoteCandidates, "quote"),
        animations: [],
        transitions: [],
      },
      editorialNotes: {
        questions: [],
        missing: linesToNotes(v1.missingInformation, "missing"),
        factChecks: [],
        weakAreas: v1.confidenceNotes
          ? [{ id: randomUUID(), text: v1.confidenceNotes }]
          : [],
      },
      evidence: {
        recording: v1.recordingStory,
        charts: v1.chartStory,
        culture: v1.culturalImpact,
        timeline: parseTimeline(v1.timeline),
        relationships: v1.relatedArtists,
      },
      performances,
      candidateFacts: v1.interestingFacts.map((text, i) => ({
        id: stableId("fact", `${text}-${i}`),
        text,
        sourceRef: null,
        category: "general",
        status: "accepted" as const,
      })),
      plannedCards: v1.suggestedCards.map((body, i) => ({
        id: stableId("pcard", `${body}-${i}`),
        title: "Story Card",
        body,
        approved: false,
        hidden: false,
        priority: 0,
        order: i,
      })),
      imageBoard: [],
    },
    meta: {
      version: EDITOR_STORY_VERSION,
      rvtr,
      collectorCompletedAt: v1.collectorCompletedAt,
      distillVersion: EDITOR_DISTILL_VERSION,
      updatedAt: new Date().toISOString(),
      editorialStatus,
      storyAngle: "cultural_moment",
      storyAngleCustom: null,
      lastRewriteAt: null,
      storyManuallyEdited: false,
      directorHandoff: {
        submittedAt: v1.directorHandoff.submittedAt,
        notes: v1.directorHandoff.notes,
        checklist: {
          story: v1.headline.trim().length > 0 && v1.longStory.trim().length > 0,
          facts: v1.interestingFacts.length > 0,
          cards: v1.suggestedCards.length > 0,
          images: v1.suggestedImages.length > 0,
          performance: v1.selectedPerformanceId != null,
        },
      },
    },
  };
}
