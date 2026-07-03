/**
 * Editor — client-safe presentation layer.
 * Maps v2 package to legacy document fields until UI redesign (Phase 3).
 */

import { buildEditorHandoff } from "@/lib/ops/studio/collector/package-handoff";
import {
  defaultPerformanceId,
  findPerformance,
  performanceCount,
  performanceTitles,
} from "@/lib/ops/studio/collector/package-archive";
import type { CollectorPackage } from "@/lib/ops/studio/collector/package-contract";
import { visualAssetUrl } from "@/lib/ops/studio/collector/visual-asset-url";

import {
  editorialStatusToConfidence,
  editorialStatusToHandoff,
  selectedPerformanceId,
  type EditorDirectorHandoffStatus,
  type EditorPerformanceStory,
  type EditorStoryPackage,
  type PerformanceWorkspace,
} from "./types";

export type EditorPerformanceSummary = {
  id: string;
  title: string;
  venue: string;
  year: number | null;
};

export type EditorDocumentField = {
  id: string;
  label: string;
  value: string;
  kind: "text" | "textarea" | "list";
  hint?: string;
};

export type EditorStoryView = {
  rvtr: string;
  artist: string;
  title: string;
  coverUrl: string | null;
  headline: string;
  summary: string;
  songDocuments: EditorDocumentField[];
  performanceDocuments: EditorDocumentField[];
  performances: EditorPerformanceSummary[];
  selectedPerformanceId: string | null;
  activePerformance: EditorPerformanceStory | null;
  screenshots: EditorPerformanceStory["screenshots"];
  confidence: ReturnType<typeof editorialStatusToConfidence>;
  confidenceNotes: string;
  directorHandoff: {
    status: EditorDirectorHandoffStatus;
    submittedAt: string | null;
    notes: string;
    canSubmit: boolean;
  };
  collectorHandoff: ReturnType<typeof buildEditorHandoff>;
  researchUpdated: boolean;
  lastSaved: string;
};

function listToText(items: string[]): string {
  return items.join("\n");
}

function textToList(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatTimeline(story: EditorStoryPackage): string {
  return story.workspace.evidence.timeline
    .map((e) => (e.date !== "—" ? `${e.date} — ${e.label}` : e.label))
    .join("\n");
}

function legacyPerformanceShape(perf: PerformanceWorkspace | null): EditorPerformanceStory | null {
  if (!perf) return null;
  return {
    performanceId: perf.performanceId,
    notes: perf.notes,
    venue: perf.venue,
    year: perf.year,
    facts: perf.observations,
    screenshots: perf.screenshots,
  };
}

export function storyListField(
  id: string,
  label: string,
  items: string[],
  hint?: string,
): EditorDocumentField {
  return { id, label, value: listToText(items), kind: "list", hint };
}

/** Legacy UI field list — maps v2 zones to flat documents until Phase 3 UI. */
export function buildSongDocuments(story: EditorStoryPackage): EditorDocumentField[] {
  const approvedFactTexts = story.approved.facts.map((f) => f.text);
  const quoteBodies = [
    ...story.approved.quotes.map((q) => q.text),
    ...story.workspace.storyIdeas.quotes
      .filter((q) => q.status === "suggested")
      .map((q) => q.body),
  ];
  const cardBodies = [
    ...story.approved.cards.map((c) => `${c.title}: ${c.body}`),
    ...story.workspace.storyIdeas.cards
      .filter((c) => c.status === "suggested")
      .map((c) => `${c.title}: ${c.body}`),
  ];
  const imageLines = [
    ...story.approved.images.map((img) => `${img.caption || "Image"} — ${img.imageUrl}`),
    ...story.workspace.storyIdeas.visualMoments.map((v) => `${v.title}: ${v.body}`),
  ];
  const weakNotes = story.workspace.editorialNotes.weakAreas.map((n) => n.text).join("\n\n");

  return [
    { id: "headline", label: "Headline", value: story.story.headline, kind: "text" },
    { id: "subtitle", label: "Subtitle", value: story.story.subtitle, kind: "text" },
    { id: "summary", label: "One-Sentence Hook", value: story.story.hook, kind: "textarea" },
    {
      id: "storySummary",
      label: "Story Summary",
      value: story.story.summary,
      kind: "textarea",
    },
    { id: "longStory", label: "Full Story", value: story.story.fullStory, kind: "textarea" },
    {
      id: "recordingStory",
      label: "Recording (Evidence)",
      value: story.workspace.evidence.recording,
      kind: "textarea",
    },
    {
      id: "chartStory",
      label: "Charts (Evidence)",
      value: story.workspace.evidence.charts,
      kind: "textarea",
    },
    {
      id: "culturalImpact",
      label: "Culture (Evidence)",
      value: story.workspace.evidence.culture,
      kind: "textarea",
    },
    {
      id: "relatedArtists",
      label: "Relationships (Evidence)",
      value: story.workspace.evidence.relationships,
      kind: "textarea",
    },
    storyListField("interestingFacts", "Approved Facts", approvedFactTexts),
    {
      id: "timeline",
      label: "Timeline (Evidence)",
      value: formatTimeline(story),
      kind: "textarea",
      hint: "One event per line",
    },
    storyListField("quoteCandidates", "Quote Candidates", dedupeStrings(quoteBodies)),
    storyListField("suggestedCards", "Suggested Cards", dedupeStrings(cardBodies)),
    storyListField("suggestedImages", "Suggested Images", dedupeStrings(imageLines)),
    storyListField(
      "missingInformation",
      "Missing Information",
      story.workspace.editorialNotes.missing.map((n) => n.text),
    ),
    {
      id: "confidenceNotes",
      label: "Editorial Notes (Weak Areas)",
      value: weakNotes,
      kind: "textarea",
    },
  ];
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildPerformanceDocuments(perf: EditorPerformanceStory | null): EditorDocumentField[] {
  if (!perf) return [];
  return [
    { id: "performanceNotes", label: "Performance Notes", value: perf.notes, kind: "textarea" },
    { id: "venue", label: "Venue", value: perf.venue, kind: "text" },
    {
      id: "year",
      label: "Year",
      value: perf.year != null ? String(perf.year) : "",
      kind: "text",
    },
    storyListField("performanceFacts", "Performance Observations", perf.facts),
  ];
}

function canSubmitToDirector(story: EditorStoryPackage): boolean {
  const handoff = editorialStatusToHandoff(story.meta.editorialStatus);
  return (
    story.story.headline.trim().length > 0 &&
    story.story.hook.trim().length > 0 &&
    handoff !== "submitted"
  );
}

export function applyStoryFieldUpdate(
  story: EditorStoryPackage,
  fieldId: string,
  value: string,
  performanceId?: string | null,
): EditorStoryPackage {
  const next: EditorStoryPackage = {
    ...story,
    story: { ...story.story },
    approved: {
      ...story.approved,
      facts: [...story.approved.facts],
      cards: [...story.approved.cards],
      images: [...story.approved.images],
      quotes: [...story.approved.quotes],
    },
    workspace: {
      ...story.workspace,
      evidence: { ...story.workspace.evidence, timeline: [...story.workspace.evidence.timeline] },
      editorialNotes: {
        ...story.workspace.editorialNotes,
        missing: [...story.workspace.editorialNotes.missing],
        weakAreas: [...story.workspace.editorialNotes.weakAreas],
      },
      storyIdeas: {
        ...story.workspace.storyIdeas,
        cards: [...story.workspace.storyIdeas.cards],
        quotes: [...story.workspace.storyIdeas.quotes],
        visualMoments: [...story.workspace.storyIdeas.visualMoments],
      },
      performances: { ...story.workspace.performances },
    },
    meta: { ...story.meta, directorHandoff: { ...story.meta.directorHandoff } },
  };

  switch (fieldId) {
    case "headline":
      next.story.headline = value;
      break;
    case "subtitle":
      next.story.subtitle = value;
      break;
    case "summary":
      next.story.hook = value;
      break;
    case "storySummary":
      next.story.summary = value;
      break;
    case "longStory":
      next.story.fullStory = value;
      break;
    case "recordingStory":
      next.workspace.evidence.recording = value;
      break;
    case "chartStory":
      next.workspace.evidence.charts = value;
      break;
    case "culturalImpact":
      next.workspace.evidence.culture = value;
      break;
    case "relatedArtists":
      next.workspace.evidence.relationships = value;
      break;
    case "interestingFacts":
      next.approved.facts = textToList(value).map((text, i) => ({
        id: next.approved.facts[i]?.id ?? `fact-${i}`,
        text,
        sourceRef: next.approved.facts[i]?.sourceRef ?? null,
      }));
      break;
    case "timeline":
      next.workspace.evidence.timeline = textToList(value).map((line) => {
        const dash = line.indexOf(" — ");
        if (dash > 0) {
          return { date: line.slice(0, dash).trim(), label: line.slice(dash + 3).trim() };
        }
        return { date: "—", label: line };
      });
      break;
    case "quoteCandidates":
      next.approved.quotes = textToList(value).map((text, i) => ({
        id: next.approved.quotes[i]?.id ?? `quote-${i}`,
        text,
        attribution: next.approved.quotes[i]?.attribution ?? null,
      }));
      break;
    case "suggestedCards":
      next.approved.cards = textToList(value).map((body, i) => ({
        id: next.approved.cards[i]?.id ?? `card-${i}`,
        title: next.approved.cards[i]?.title ?? "Story Card",
        body,
        cardType: next.approved.cards[i]?.cardType ?? "general",
      }));
      break;
    case "suggestedImages":
      break;
    case "missingInformation":
      next.workspace.editorialNotes.missing = textToList(value).map((text, i) => ({
        id: next.workspace.editorialNotes.missing[i]?.id ?? `missing-${i}`,
        text,
      }));
      break;
    case "confidenceNotes":
      next.workspace.editorialNotes.weakAreas = value.trim()
        ? [{ id: "weak-0", text: value }]
        : [];
      break;
    default:
      break;
  }

  const perfId = performanceId ?? selectedPerformanceId(next);
  if (!perfId || !next.workspace.performances[perfId]) {
    return updateHandoffChecklistClient(next);
  }

  const perf = { ...next.workspace.performances[perfId]! };
  if (fieldId === "performanceNotes") perf.notes = value;
  else if (fieldId === "venue") perf.venue = value;
  else if (fieldId === "year") perf.year = value.trim() ? parseInt(value, 10) || null : null;
  else if (fieldId === "performanceFacts") perf.observations = textToList(value);

  next.workspace.performances[perfId] = perf;
  if (fieldId === "performanceNotes" || fieldId === "venue" || fieldId === "year") {
    next.approved.performanceId = perfId;
  }

  return updateHandoffChecklistClient(next);
}

function updateHandoffChecklistClient(story: EditorStoryPackage): EditorStoryPackage {
  return {
    ...story,
    meta: {
      ...story.meta,
      editorialStatus:
        story.meta.editorialStatus === "submitted" ? "submitted" : "in_progress",
      directorHandoff: {
        ...story.meta.directorHandoff,
        checklist: {
          story:
            story.story.headline.trim().length > 0 &&
            story.story.hook.trim().length > 0 &&
            story.story.fullStory.trim().length > 0,
          facts: story.approved.facts.length > 0,
          cards: story.approved.cards.length > 0,
          images: story.approved.images.length > 0,
          performance: story.approved.performanceId != null,
        },
      },
    },
  };
}

export function buildEditorStoryView(
  collector: CollectorPackage,
  story: EditorStoryPackage,
  perfOverride?: string | null,
): EditorStoryView {
  const perfId =
    perfOverride ?? selectedPerformanceId(story) ?? defaultPerformanceId(collector.performances ?? []);
  const storyPerformances = story.workspace.performances ?? {};
  const workspacePerf = perfId ? storyPerformances[perfId] ?? null : null;
  const activePerf = legacyPerformanceShape(workspacePerf);
  const collectorPerf = findPerformance(collector, perfId);

  const hero = collectorPerf?.visualAssets.extraction.assets.find((a) => a.category === "Hero");
  const coverUrl =
    collector.song?.coverUrl ??
    collector.visualAssets?.coverUrl ??
    (hero ? visualAssetUrl(collector.rvtr, hero.filename) : null);

  const handoffStatus = editorialStatusToHandoff(story.meta.editorialStatus);
  const directorStatus: EditorDirectorHandoffStatus =
    handoffStatus === "no_draft" ? "not_ready" : handoffStatus;

  return {
    rvtr: collector.rvtr,
    artist: collector.artist,
    title: collector.title,
    coverUrl,
    headline: story.story.headline,
    summary: story.story.hook,
    songDocuments: buildSongDocuments(story),
    performanceDocuments: buildPerformanceDocuments(activePerf),
    performances: (collector.performances ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      venue: storyPerformances[p.id]?.venue || p.detectedVenue || "",
      year: storyPerformances[p.id]?.year ?? p.detectedYear,
    })),
    selectedPerformanceId: perfId,
    activePerformance: activePerf,
    screenshots: activePerf?.screenshots ?? [],
    confidence: editorialStatusToConfidence(story.meta.editorialStatus),
    confidenceNotes: story.workspace.editorialNotes.weakAreas.map((n) => n.text).join("\n\n"),
    directorHandoff: {
      status: directorStatus,
      submittedAt: story.meta.directorHandoff.submittedAt,
      notes: story.meta.directorHandoff.notes,
      canSubmit: canSubmitToDirector(story),
    },
    collectorHandoff: buildEditorHandoff(collector, perfId),
    researchUpdated: story.meta.collectorCompletedAt !== collector.completedAt,
    lastSaved: story.meta.updatedAt,
  };
}

export function performanceCountLabel(collector: CollectorPackage): string {
  const count = performanceCount(collector);
  if (count === 0) return "No performances";
  if (count === 1) return "1 performance";
  return `${count} performances — ${performanceTitles(collector).join(" · ")}`;
}
