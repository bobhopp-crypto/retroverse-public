import "server-only";

import { findPerformance } from "@/lib/ops/studio/collector/package-archive";
import type { CollectorPackage } from "@/lib/ops/studio/collector/package-contract";

import type { DirectorEditorialPackage, EditorStoryPackage, NarrativeBlueprint } from "./types";
import { buildNarrativeBlueprint } from "./narrative-blueprint";
import {
  formatDirectorBriefForNotes,
} from "./editorial-brain";
import { isInvalidCollectorFact } from "@/lib/ops/studio/retrograph/fact-guards";

function parseArtistTitle(editor: EditorStoryPackage): { artist: string; title: string } {
  const canonical = editor.workspace.evidence.canonical?.songSummary;
  if (canonical) {
    const m = canonical.match(/^(.+?) — "(.+?)"/);
    if (m?.[1] && m[2]) return { artist: m[1].trim(), title: m[2].trim() };
  }

  const summary = editor.story.summary;
  const sumMatch = summary.match(/^(.+?)'s "(.+?)"/);
  if (sumMatch?.[1] && sumMatch[2]) {
    return { artist: sumMatch[1].trim(), title: sumMatch[2].trim() };
  }

  const subtitle = editor.story.subtitle;
  const subArtist = subtitle.split("·")[0]?.trim();
  if (subArtist && subArtist.length > 1) {
    const fromHeadline = editor.story.headline.split(/[:—–-]/)[0]?.trim();
    return {
      artist: subArtist,
      title: fromHeadline && fromHeadline.length > 2 ? fromHeadline : editor.story.headline,
    };
  }

  return { artist: "Unknown Artist", title: editor.story.headline };
}

/**
 * Build Director handoff from Editor package only — no Collector access.
 * Used upstream of Director; Director itself reads the saved handoff file.
 */
export function buildDirectorHandoffFromEditor(
  editor: EditorStoryPackage,
): DirectorEditorialPackage {
  const synced = syncApprovedLayerFromWorkspace(editor);
  const { artist, title } = parseArtistTitle(synced);
  const perfId = synced.approved.performanceId;
  const workspacePerf = perfId ? synced.workspace.performances[perfId] : null;
  const bp = synced.narrativeBlueprint;
  const bpPerf = bp?.recommendedPerformance;

  const performanceTitle = bpPerf?.title || "Performance";

  const approvedFacts = [...synced.approved.facts].filter((f) => !isInvalidCollectorFact(f.text));

  const brain = synced.editorialBrain;
  const directorBrief = brain?.directorBrief;
  const briefNotes = directorBrief ? formatDirectorBriefForNotes(directorBrief) : "";
  const editorNotes = [synced.meta.directorHandoff.notes, briefNotes].filter(Boolean).join("\n\n");

  return {
    version: 2,
    rvtr: synced.meta.rvtr.trim().toUpperCase(),
    artist,
    title,
    story: { ...synced.story },
    approvedFacts,
    approvedCards: [...synced.approved.cards],
    approvedImages: [...synced.approved.images],
    approvedQuotes: [...synced.approved.quotes],
    performance: {
      id: perfId ?? bpPerf?.performanceId ?? "",
      title: performanceTitle,
      venue: workspacePerf?.venue ?? "",
      year: workspacePerf?.year ?? null,
      notes: workspacePerf?.notes ?? bpPerf?.reason ?? "",
      screenshots: (workspacePerf?.screenshots ?? []).filter((s) => s.approved),
    },
    narrativeBlueprint: bp ?? minimalBlueprintFallback(synced, artist, title),
    submittedAt: synced.meta.directorHandoff.submittedAt ?? new Date().toISOString(),
    editorNotesForDirector: editorNotes || undefined,
    directorBrief,
    editorialQuality: synced.workspace.editorialReview
      ? {
          patronValue: synced.workspace.editorialReview.patronValue ?? null,
          storyQuality: synced.workspace.editorialReview.storyQuality ?? null,
        }
      : undefined,
  };
}

function syncApprovedLayerFromWorkspace(editor: EditorStoryPackage): EditorStoryPackage {
  const accepted = editor.workspace.candidateFacts.filter((f) => f.status === "accepted");
  return {
    ...editor,
    approved: {
      ...editor.approved,
      facts:
        editor.approved.facts.length > 0
          ? editor.approved.facts
          : accepted
              .filter((f) => !isInvalidCollectorFact(f.text))
              .map((f) => ({
              id: f.id,
              text: f.text,
              sourceRef: f.sourceRef,
            })),
      images:
        editor.approved.images.length > 0
          ? editor.approved.images
          : editor.workspace.imageBoard
              .filter((i) => i.approved)
              .map((i) => ({
                assetId: i.assetId,
                caption: i.caption,
                imageUrl: i.imageUrl,
                performanceId: i.performanceId,
              })),
    },
  };
}

function minimalBlueprintFallback(
  editor: EditorStoryPackage,
  artist: string,
  title: string,
): NarrativeBlueprint {
  return {
    version: 1,
    opening: editor.story.hook || editor.story.headline,
    closing: editor.story.summary || editor.story.fullStory.slice(0, 200),
    storyBeats: [],
    keyMoments: [],
    emotionalArc: "discovery",
    recommendedPace: "moderate",
    recommendedPerformance: {
      performanceId: editor.approved.performanceId ?? "",
      title: "Unknown",
      reason: "No narrative blueprint on file",
    },
    primaryTheme: "culture",
    secondaryTheme: null,
    recommendedEnding: {
      style: "return_to_opening",
      description: editor.story.summary.slice(0, 160) || "Return to opening idea",
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Build the polished package Director receives (legacy — includes Collector for performance title).
 * Prefer buildDirectorHandoffFromEditor when preparing handoff files.
 */
export function buildDirectorEditorialPackage(
  editor: EditorStoryPackage,
  collector: CollectorPackage,
): DirectorEditorialPackage {
  const synced = {
    ...editor,
    approved: {
      ...editor.approved,
      cards: editor.workspace.plannedCards
        .filter((c) => c.approved && !c.hidden)
        .sort((a, b) => a.order - b.order)
        .map((c) => ({
          id: c.id,
          title: c.title,
          body: c.body,
          cardType: "story",
        })),
      images: editor.workspace.imageBoard
        .filter((i) => i.approved)
        .sort((a, b) => a.order - b.order)
        .map((i) => ({
          assetId: i.assetId,
          caption: i.caption,
          imageUrl: i.imageUrl,
          performanceId: i.performanceId,
        })),
      facts: editor.workspace.candidateFacts
        .filter((f) => f.status === "accepted" || f.status === "pending")
        .map((f) => ({ id: f.id, text: f.text, sourceRef: f.sourceRef })),
    },
  };

  const perfId = synced.approved.performanceId;
  const collectorPerf = perfId ? findPerformance(collector, perfId) : null;
  const workspacePerf = perfId ? synced.workspace.performances[perfId] : null;

  const approvedScreenshots = (workspacePerf?.screenshots ?? []).filter((s) => s.approved);

  return {
    version: 2,
    rvtr: synced.meta.rvtr,
    artist: collector.artist,
    title: collector.title,
    story: { ...synced.story },
    approvedFacts: [...synced.approved.facts],
    approvedCards: [...synced.approved.cards],
    approvedImages: [...synced.approved.images],
    approvedQuotes: [...synced.approved.quotes],
    performance: {
      id: perfId ?? "",
      title: collectorPerf?.title ?? "Unknown",
      venue: workspacePerf?.venue ?? collectorPerf?.detectedVenue ?? "",
      year: workspacePerf?.year ?? collectorPerf?.detectedYear ?? null,
      notes: workspacePerf?.notes ?? "",
      screenshots: approvedScreenshots,
    },
    narrativeBlueprint:
      synced.narrativeBlueprint ?? buildNarrativeBlueprint(collector, synced),
    submittedAt: synced.meta.directorHandoff.submittedAt ?? new Date().toISOString(),
    editorNotesForDirector: synced.meta.directorHandoff.notes || undefined,
  };
}

export function updateHandoffChecklist(story: EditorStoryPackage): EditorStoryPackage {
  const checklist = {
    story:
      story.story.headline.trim().length > 0 &&
      story.story.hook.trim().length > 0 &&
      story.story.fullStory.trim().length > 0,
    facts: story.approved.facts.length > 0,
    cards: story.approved.cards.length > 0,
    images: story.approved.images.length > 0,
    performance: story.approved.performanceId != null,
  };

  return {
    ...story,
    meta: {
      ...story.meta,
      directorHandoff: {
        ...story.meta.directorHandoff,
        checklist,
      },
    },
  };
}
