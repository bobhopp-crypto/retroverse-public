/**
 * Step 4 — Build Pages: one page per exhibit, global fact dedup, public-safe copy.
 */

import type { Retrograph } from "@/lib/ops/studio/retrograph/types";
import type { DirectorEditorialPackage } from "@/lib/ops/studio/editor/types";

import {
  headlineFromCopy,
  normalizeFactKey,
  sanitizePublicCopy,
} from "./sanitize-public-copy";
import type { DirectorExhibit, DirectorStory, DirectorStoryPage, DirectorVisualConcept } from "./types";
import { visualConceptForExhibit } from "./design-visual-concepts";

function factText(retrograph: Retrograph, factId: string): string {
  const f =
    retrograph.facts.find((x) => x.id === factId) ??
    retrograph.pendingFacts.find((x) => x.id === factId);
  return f?.text.trim() ?? "";
}

function resolveTemplate(
  exhibit: DirectorExhibit,
  hasMedia: boolean,
  copyLength: number,
  visualConcepts?: DirectorVisualConcept[],
): string {
  const vc = visualConcepts ? visualConceptForExhibit(exhibit.id, visualConcepts) : undefined;
  if (vc?.templateId && vc.templateId !== "story") return vc.templateId;
  return pickTemplate(exhibit, hasMedia, copyLength);
}

function pickTemplate(
  exhibit: DirectorExhibit,
  hasMedia: boolean,
  copyLength: number,
): string {
  if (exhibit.storyId === "hero") return "hero";
  if (exhibit.storyId === "chart_journey" && exhibit.id.endsWith("peak_moment")) return "chart";
  if (exhibit.storyId === "legacy" && exhibit.id.endsWith("timeline_legacy")) return "timeline";
  if (exhibit.storyId === "song_dna") return "gallery";
  if (exhibit.storyId === "performance_history") {
    return exhibit.id.includes("video") || exhibit.id.includes("official") ? "performance" : "gallery";
  }
  if (hasMedia && copyLength < 80) return "gallery";
  if (copyLength > 0 && copyLength < 140) return "quote";
  return "quote";
}

function claimExhibitFacts(
  retrograph: Retrograph,
  factIds: string[],
  usedFactIds: Set<string>,
  usedFactKeys: Set<string>,
): { ids: string[]; copy: string } {
  const claimed: string[] = [];
  const texts: string[] = [];

  for (const factId of factIds) {
    const raw = factText(retrograph, factId);
    const clean = sanitizePublicCopy(raw);
    if (!clean) continue;
    const key = normalizeFactKey(clean);
    if (usedFactIds.has(factId) || usedFactKeys.has(key)) continue;
    usedFactIds.add(factId);
    usedFactKeys.add(key);
    claimed.push(factId);
    texts.push(clean);
  }

  return { ids: claimed, copy: texts.join("\n\n") };
}

function pushPage(
  pages: DirectorStoryPage[],
  story: DirectorStory,
  exhibit: DirectorExhibit,
  partial: Omit<DirectorStoryPage, "id" | "storyId" | "exhibitId" | "sceneNumber">,
  pageIndex: { n: number },
): void {
  const page: DirectorStoryPage = {
    id: `page-${exhibit.id}-${pageIndex.n++}`,
    storyId: exhibit.storyId,
    exhibitId: exhibit.id,
    sceneNumber: null,
    ...partial,
  };
  pages.push(page);
  exhibit.pageIds.push(page.id);
  story.pageIds.push(page.id);
}

export function buildPagesFromExhibits(
  retrograph: Retrograph,
  handoff: DirectorEditorialPackage,
  stories: DirectorStory[],
  exhibits: DirectorExhibit[],
  visualConcepts?: DirectorVisualConcept[],
): DirectorStoryPage[] {
  const pages: DirectorStoryPage[] = [];
  const pageIndex = { n: 0 };
  const usedFactIds = new Set<string>();
  const usedFactKeys = new Set<string>();
  const usedMediaIds = new Set<string>();

  for (const exhibit of exhibits) {
    if (exhibit.status === "skipped") continue;

    const story = stories.find((s) => s.id === exhibit.storyId);
    if (!story || story.status === "skipped") continue;

    if (exhibit.storyId === "hero") {
      const cover = retrograph.media.images.find((i) => i.category === "cover");
      const mediaIds = cover ? [cover.assetId] : exhibit.mediaIds.slice(0, 1);
      pushPage(pages, story, exhibit, {
        title: "Song Identity",
        headline: retrograph.song.title,
        supportingCopy: retrograph.song.albumTitle
          ? `${retrograph.song.artist} · ${retrograph.song.albumTitle}${retrograph.song.year ? ` (${retrograph.song.year})` : ""}`
          : retrograph.song.artist,
        factIds: [],
        mediaIds,
        templateId: resolveTemplate(exhibit, false, 0, visualConcepts),
      }, pageIndex);
      continue;
    }

    if (exhibit.storyId === "introduction") {
      pushPage(pages, story, exhibit, {
        title: "Introduction",
        headline: "Why this song matters",
        supportingCopy: sanitizePublicCopy(handoff.story.hook || story.hook),
        factIds: [],
        mediaIds: [],
        templateId: resolveTemplate(exhibit, false, 80, visualConcepts),
      }, pageIndex);
      continue;
    }

    if (exhibit.storyId === "chart_journey" && exhibit.id.endsWith("peak_moment")) {
      const { ids, copy } = claimExhibitFacts(retrograph, exhibit.factIds, usedFactIds, usedFactKeys);
      pushPage(pages, story, exhibit, {
        title: "Chart Journey",
        headline: `Hot 100 #${retrograph.charts.peakHot100}`,
        supportingCopy: copy || sanitizePublicCopy(retrograph.charts.summary ?? ""),
        factIds: ids,
        mediaIds: exhibit.mediaIds.filter((id) => !usedMediaIds.has(id)).slice(0, 1),
        templateId: resolveTemplate(exhibit, exhibit.mediaIds.length > 0, copy.length, visualConcepts),
      }, pageIndex);
      if (exhibit.mediaIds[0]) usedMediaIds.add(exhibit.mediaIds[0]!);
      continue;
    }

    if (exhibit.storyId === "song_dna") {
      pushPage(pages, story, exhibit, {
        title: "Song DNA",
        headline: "Song DNA",
        supportingCopy: "Tempo, key, and energy — the musical fingerprint of this track.",
        factIds: [],
        mediaIds: [],
        templateId: resolveTemplate(exhibit, false, 0, visualConcepts),
      }, pageIndex);
      continue;
    }

    if (exhibit.storyId === "legacy" && exhibit.id.endsWith("timeline_legacy")) {
      if (retrograph.timeline.length >= 2) {
        pushPage(pages, story, exhibit, {
          title: "Timeline",
          headline: "Legacy timeline",
          supportingCopy: retrograph.timeline
            .slice(0, 6)
            .map((t) => `${t.date}: ${t.label}`)
            .join(" · "),
          factIds: exhibit.factIds.slice(0, 2),
          mediaIds: [],
          templateId: resolveTemplate(exhibit, false, 0, visualConcepts),
        }, pageIndex);
      }
      continue;
    }

    if (exhibit.storyId === "performance_history") {
      const perf = retrograph.performances[0];
      const { ids, copy } = claimExhibitFacts(retrograph, exhibit.factIds, usedFactIds, usedFactKeys);
      const mediaIds = exhibit.mediaIds.filter((id) => !usedMediaIds.has(id)).slice(0, 2);
      for (const id of mediaIds) usedMediaIds.add(id);
      const headlineByExhibit: Record<string, string> = {
        "performance_history:official_video": "Official music video",
        "performance_history:live_moments": "Live on stage",
        "performance_history:video_gallery": "Video gallery",
      };
      const headline =
        headlineByExhibit[exhibit.id] ??
        (perf?.title?.includes("1981") ? "1981 performance" : perf?.title ?? exhibit.title);
      const body = copy || sanitizePublicCopy(perf?.notes ?? handoff.performance.notes ?? "");
      if (!body && mediaIds.length === 0) continue;
      pushPage(pages, story, exhibit, {
        title: exhibit.title,
        headline,
        supportingCopy: body || exhibit.purpose,
        factIds: ids,
        mediaIds,
        templateId: resolveTemplate(exhibit, mediaIds.length > 0, body.length, visualConcepts),
      }, pageIndex);
      continue;
    }

    const { ids, copy } = claimExhibitFacts(retrograph, exhibit.factIds, usedFactIds, usedFactKeys);
    const mediaIds = exhibit.mediaIds.filter((id) => !usedMediaIds.has(id)).slice(0, 1);
    for (const id of mediaIds) usedMediaIds.add(id);

    if (!copy && mediaIds.length === 0) continue;

    const headline = copy
      ? headlineFromCopy(copy, exhibit.title)
      : exhibit.title;

    pushPage(pages, story, exhibit, {
      title: exhibit.title,
      headline,
      supportingCopy: copy || exhibit.purpose,
      factIds: ids,
      mediaIds,
      templateId: resolveTemplate(exhibit, mediaIds.length > 0, copy.length, visualConcepts),
    }, pageIndex);
  }

  for (const story of stories) {
    story.pageIds = [...new Set(story.pageIds)];
  }

  return pages;
}
