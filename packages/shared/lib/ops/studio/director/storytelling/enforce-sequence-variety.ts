/**
 * Sprint 3.32 — enforce page sequencing variety rules.
 */

import type { Retrograph } from "@/lib/ops/studio/retrograph/types";

import { normalizeFactKey, sanitizePublicCopy } from "./sanitize-public-copy";
import type {
  DirectorSequenceViolation,
  DirectorStoryPage,
  DirectorStoryboardBeat,
} from "./types";

const STYLE_FAMILY: Record<string, string> = {
  hero: "hero",
  story: "text",
  quote: "text",
  chart: "chart",
  timeline: "timeline",
  gallery: "image",
  performance: "performance",
  fact_stack: "fact",
};

function styleFamily(templateId: string): string {
  return STYLE_FAMILY[templateId] ?? templateId;
}

function clusterKey(page: DirectorStoryPage): string {
  return `${page.storyId}:${page.exhibitId}`;
}

function alternateTemplate(page: DirectorStoryPage): string {
  if (page.mediaIds.length > 0 && page.templateId === "story") return "gallery";
  if (page.supportingCopy.length < 120 && page.templateId === "story") return "quote";
  if (page.templateId === "story") return "quote";
  return "gallery";
}

export type SequenceVarietyResult = {
  pages: DirectorStoryPage[];
  storyboard: DirectorStoryboardBeat[];
  violations: DirectorSequenceViolation[];
};

export function enforceSequenceVariety(
  pages: DirectorStoryPage[],
  storyboard: DirectorStoryboardBeat[],
  retrograph: Retrograph,
  options?: { hasSongDna?: boolean },
): SequenceVarietyResult {
  const violations: DirectorSequenceViolation[] = [];
  const pageById = new Map(pages.map((p) => [p.id, p]));
  const orderedIds = storyboard.flatMap((b) => b.pageIds);
  let ordered = orderedIds
    .map((id) => pageById.get(id))
    .filter((p): p is DirectorStoryPage => Boolean(p));

  ordered = ordered.filter((page) => {
    const copy = sanitizePublicCopy(page.supportingCopy);
    const headline = page.headline?.trim() ?? "";
    if (page.templateId !== "hero" && page.templateId !== "gallery" && page.storyId !== "song_dna") {
      if (!copy && page.mediaIds.length === 0) {
        violations.push({
          rule: "no_empty_cards",
          message: `Removed empty page "${page.title}"`,
          pageIds: [page.id],
          severity: "warning",
          fixHint: "Add supporting copy or media, or drop the exhibit",
        });
        return false;
      }
    }
    if (DJCopy(copy)) {
      violations.push({
        rule: "no_dj_metadata",
        message: `Removed page with private DJ metadata: ${headline || page.title}`,
        pageIds: [page.id],
        severity: "blocking",
        fixHint: "Strip VirtualDJ play counts and file paths in Editor facts",
      });
      return false;
    }
    page.supportingCopy = copy;
    return true;
  });

  const recentFactKeys: string[] = [];
  const recentMedia: string[] = [];
  const titleCounts = new Map<string, number>();
  const kept: DirectorStoryPage[] = [];

  for (const page of ordered) {
    let drop = false;
    const factKey = page.factIds.map((id) => {
      const f =
        retrograph.facts.find((x) => x.id === id) ??
        retrograph.pendingFacts.find((x) => x.id === id);
      return f ? normalizeFactKey(f.text) : "";
    }).find(Boolean);

    if (factKey && recentFactKeys.slice(-5).includes(factKey)) {
      violations.push({
        rule: "no_repeat_fact_within_5",
        message: `Dropped repeat fact near scene "${page.headline}"`,
        pageIds: [page.id],
        severity: "warning",
        fixHint: "Merge duplicate facts into one exhibit page",
      });
      drop = true;
    }

    const mediaId = page.mediaIds[0];
    if (!drop && mediaId && recentMedia.slice(-3).includes(mediaId)) {
      if (page.mediaIds.length <= 1) {
        page.mediaIds = [];
      } else {
        violations.push({
          rule: "no_repeat_media_within_3",
          message: `Reused image within 3 pages — cleared media on "${page.headline}"`,
          pageIds: [page.id],
          severity: "warning",
          fixHint: "Assign alternate gallery frames from Collector",
        });
      }
    }

    const titleKey = page.headline.trim().toLowerCase();
    const titleUses = titleCounts.get(titleKey) ?? 0;
    if (!drop && titleUses >= 1 && titleKey !== "song dna" && titleKey !== "timeline") {
      page.headline = `${page.headline} (${page.storyId.replace(/_/g, " ")})`;
      violations.push({
        rule: "no_duplicate_titles",
        message: `Renamed duplicate title "${titleKey}"`,
        pageIds: [page.id],
        severity: "warning",
        fixHint: "Use exhibit-specific headlines instead of category labels",
      });
    }
    titleCounts.set(titleKey, titleUses + 1);

    if (!drop) {
      kept.push(page);
      if (factKey) recentFactKeys.push(factKey);
      if (mediaId) recentMedia.push(mediaId);
    }
  }

  ordered = kept;

  for (let i = 0; i < ordered.length; i++) {
    const page = ordered[i]!;
    const style = styleFamily(page.templateId);
    const prev1 = i >= 1 ? styleFamily(ordered[i - 1]!.templateId) : null;
    const prev2 = i >= 2 ? styleFamily(ordered[i - 2]!.templateId) : null;
    if (style === prev1 && style === prev2 && style === "text") {
      const nextTemplate = alternateTemplate(page);
      violations.push({
        rule: "max_2_same_style",
        message: `Scene ${i + 1}: switched "${page.headline}" from Story to ${nextTemplate} to break a text run`,
        pageIds: [page.id],
        severity: "warning",
        fixHint: "Alternate text with gallery, chart, timeline, or performance beats",
      });
      page.templateId = nextTemplate;
    }

    const cluster = clusterKey(page);
    const cPrev1 = i >= 1 ? clusterKey(ordered[i - 1]!) : null;
    const cPrev2 = i >= 2 ? clusterKey(ordered[i - 2]!) : null;
    if (cluster === cPrev1 && cluster === cPrev2) {
      violations.push({
        rule: "max_2_same_cluster",
        message: `Three pages from same exhibit cluster "${cluster}" in a row — consider merging`,
        pageIds: [ordered[i - 2]!.id, ordered[i - 1]!.id, page.id],
        severity: "warning",
        fixHint: "Combine exhibit facts into one page instead of splitting",
      });
    }
  }

  if (retrograph.charts.peakHot100 != null && !ordered.some((p) => p.storyId === "chart_journey")) {
    violations.push({
      rule: "chart_journey_required",
      message: "Chart Journey missing despite chart data in Retrograph",
      pageIds: [],
      severity: "blocking",
      fixHint: "Ensure chart_journey story builds at least one page",
    });
  }

  if (options?.hasSongDna && !ordered.some((p) => p.storyId === "song_dna")) {
    violations.push({
      rule: "song_dna_required",
      message: "Song DNA missing despite song-dna.json",
      pageIds: [],
      severity: "blocking",
      fixHint: "Ensure song_dna story produces a gallery page",
    });
  }

  const culturalTitles = ordered.filter((p) => p.headline.toLowerCase() === "cultural impact");
  if (culturalTitles.length > 1) {
    violations.push({
      rule: "no_generic_cultural_impact",
      message: `${culturalTitles.length} pages titled "Cultural Impact" — headlines need differentiation`,
      pageIds: culturalTitles.map((p) => p.id),
      severity: "warning",
      fixHint: "Use exhibit titles or fact-derived headlines",
    });
  }

  ordered.forEach((page, index) => {
    page.sceneNumber = index + 1;
  });

  const keptIds = new Set(ordered.map((p) => p.id));
  const updatedStoryboard = storyboard
    .map((beat) => ({
      ...beat,
      pageIds: beat.pageIds.filter((id) => keptIds.has(id)),
    }))
    .filter((beat) => beat.pageIds.length > 0);

  return { pages: ordered, storyboard: updatedStoryboard, violations };
}

function DJCopy(text: string): boolean {
  return /virtualdj|play count:\s*\d/i.test(text);
}

export function formatSequenceViolationsForReview(
  violations: DirectorSequenceViolation[],
): string[] {
  return violations.map((v) => `[${v.rule}] ${v.message} — Fix: ${v.fixHint}`);
}
