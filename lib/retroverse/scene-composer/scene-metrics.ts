import type { RenderSpecScene } from "@/lib/retroverse/renderer/types";

import type { SceneCompositionStats } from "./types";

function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function sceneWords(scene: RenderSpecScene): number {
  return (
    wordCount(scene.headline) +
    wordCount(scene.supportingCopy) +
    scene.assets.factTexts.reduce((sum, f) => sum + wordCount(f), 0)
  );
}

function imageSlots(scenes: RenderSpecScene[]): number {
  return scenes.reduce((sum, s) => sum + s.assets.imageUrls.length, 0);
}

export function computeCompositionStats(
  original: RenderSpecScene[],
  composed: RenderSpecScene[],
): SceneCompositionStats {
  const origWords = original.reduce((sum, s) => sum + sceneWords(s), 0);
  const compWords = composed.reduce((sum, s) => sum + sceneWords(s), 0);
  const origFacts = original.reduce((sum, s) => sum + s.assets.factTexts.filter(Boolean).length, 0);
  const compFacts = composed.reduce((sum, s) => sum + s.assets.factTexts.filter(Boolean).length, 0);

  return {
    originalSceneCount: original.length,
    composedSceneCount: composed.length,
    avgWordsPerSceneOriginal: original.length ? Math.round(origWords / original.length) : 0,
    avgWordsPerSceneComposed: composed.length ? Math.round(compWords / composed.length) : 0,
    avgFactsPerSceneOriginal: original.length
      ? Math.round((origFacts / original.length) * 10) / 10
      : 0,
    avgFactsPerSceneComposed: composed.length
      ? Math.round((compFacts / composed.length) * 10) / 10
      : 0,
    imageSlotsOriginal: imageSlots(original),
    imageSlotsComposed: imageSlots(composed),
  };
}

export function normalizeHeadline(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isQuoteLike(text: string): boolean {
  const t = text.trim();
  return t.startsWith('"') || t.startsWith("'") || t.includes("said") || t.length > 80;
}

export function isChartFact(text: string): boolean {
  return /#\d+|billboard|chart|peaked|weeks on/i.test(text);
}

export function duplicateFact(a: string, b: string): boolean {
  const na = a.trim().toLowerCase();
  const nb = b.trim().toLowerCase();
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

/** Wikipedia-style opener — patron should swipe past these. */
export function isEncyclopediaCopy(text: string): boolean {
  const t = text.trim();
  return (
    /^"[^"]+" is a song by/i.test(t) ||
    /^it was released as/i.test(t) ||
    /^the singles is a compilation/i.test(t) ||
    /^\d+ cultural context notes/i.test(t)
  );
}

export function sanitizeMomentCopy(copy: string, maxWords = 18): string {
  let result = copy.trim();
  if (!result) return "";

  if (isEncyclopediaCopy(result)) {
    const chart = result.match(/#\d+|peak[^.!?]*/i);
    if (chart) return chart[0]!.trim();
    return "";
  }

  const words = result.split(/\s+/);
  if (words.length > maxWords) {
    return `${words.slice(0, maxWords).join(" ")}…`;
  }
  return result;
}

export function isYearOnlyHeadline(headline: string): boolean {
  return /^\d{4}$/.test(headline.trim());
}

export function isWeakTimelineMoment(input: {
  headline: string;
  supportingCopy: string;
  imageCount: number;
}): boolean {
  if (input.imageCount > 0) return false;
  if (!isYearOnlyHeadline(input.headline)) return false;
  const copy = input.supportingCopy.trim();
  return copy.length < 24 || /performance setting|how the song began|last chart fact/i.test(copy);
}

export function trimSupportingCopy(copy: string, factTexts: string[]): string {
  let result = copy.trim();
  for (const fact of factTexts) {
    if (!fact.trim()) continue;
    if (result.includes(fact.trim())) {
      result = result.replace(fact.trim(), "").replace(/\s{2,}/g, " ").trim();
    }
  }
  return result;
}
