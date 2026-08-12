import type { TimelineEvent } from "@/lib/ops/intelligence/song-package-types";

import type { PublicSongStoryCard } from "./load-public-song-payload";
import { sanitizePublicCopy, sanitizePublicCopyOrNull } from "./public-copy";

/** Trim and collapse whitespace only — no typo correction. */
export function trimDisplayField(value: string | null | undefined): string {
  return value?.trim().replace(/\s{2,}/g, " ") ?? "";
}

export function isProductionAlbumLabel(title: string): boolean {
  const t = title.trim();
  if (t.length > 80) return true;
  return /produced by|live at|concert for|prince'?s trust|wembley|\bdvd\b|\bhd\b|\bfestival\b|\brpm\d+/i.test(t);
}

export function sanitizeDisplayAlbumTitle(raw: string | null | undefined): string | null {
  const title = raw?.trim();
  if (!title || isProductionAlbumLabel(title)) return null;
  return title;
}

/** Internal pipeline/diagnostic copy — not patron-facing facts. */
export function isInternalPublicMetadata(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (/^retroverse track identity:\s*RVTR\d{6}\.?$/i.test(t)) return true;
  if (/^retroverse track identity:/i.test(t) && /\bRVTR\d{6}\b/i.test(t)) return true;
  if (/^RVTR\d{6}\.?$/i.test(t)) return true;
  if (/^package (?:store|pipeline) status:/i.test(t)) return true;
  if (/^loader (?:path|diagnostic):/i.test(t)) return true;
  return false;
}

function factKey(text: string): string {
  return sanitizePublicCopy(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function filterPublicText(text: string): string | null {
  if (isInternalPublicMetadata(text)) return null;
  return sanitizePublicCopyOrNull(text);
}

export type PreparedStoryCard = {
  headline: string;
  body: string;
  sourceUrl: string | null;
};

export type PreparedSongSections = {
  storyParagraphs: string[];
  storyCards: PreparedStoryCard[];
  trivia: string[];
  timeline: TimelineEvent[];
};

export function preparePublicSongSections(input: {
  storyText: string;
  storyCards: PublicSongStoryCard[];
  trivia: string[];
  timeline: TimelineEvent[];
}): PreparedSongSections {
  const seenExact = new Set<string>();
  const storyParagraphs: string[] = [];

  const chartStory = filterPublicText(input.storyText);
  if (chartStory) {
    seenExact.add(factKey(chartStory));
    storyParagraphs.push(chartStory);
  }

  const storyCards: PreparedStoryCard[] = [];
  for (const card of input.storyCards) {
    const body = filterPublicText(card.body);
    if (!body) continue;
    const headline = sanitizePublicCopy(card.headline).trim();
    const bodyKey = factKey(body);
    if (!bodyKey || seenExact.has(bodyKey)) continue;
    seenExact.add(bodyKey);
    storyCards.push({ headline, body, sourceUrl: card.sourceUrl ?? null });
  }

  const trivia: string[] = [];
  for (const fact of input.trivia) {
    const cleaned = filterPublicText(fact);
    if (!cleaned) continue;
    const key = factKey(cleaned);
    if (!key || seenExact.has(key)) continue;
    seenExact.add(key);
    trivia.push(cleaned);
  }

  const timeline: TimelineEvent[] = [];
  const pipelineTitles = /^(origin|where did that name come from\??)$/i;
  for (const event of input.timeline) {
    const description = event.description ? filterPublicText(event.description) : null;
    const title = sanitizePublicCopy(event.title ?? "").trim();
    if (pipelineTitles.test(title)) continue;
    if (!description) continue;
    const bodyKey = factKey(description);
    if (!bodyKey || seenExact.has(bodyKey)) continue;
    seenExact.add(bodyKey);
    timeline.push({
      ...event,
      title: title || event.title || "Event",
      description,
    });
  }

  return { storyParagraphs, storyCards, trivia, timeline };
}
