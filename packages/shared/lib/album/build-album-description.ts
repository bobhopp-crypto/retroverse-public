import { sanitizePublicCopy } from "@/lib/retroverse/experience/public-copy";

import type { AlbumSourceHints } from "./load-album-source-data";

export type AlbumDescriptionInput = {
  title: string;
  artistName: string;
  releaseYear: number | null;
  trackCount: number;
  b200Peak: number | null;
  chartWeeks: number;
  weeksAtNumberOne: number;
  source: AlbumSourceHints;
  majorSinglesFromChart: string[];
};

const WIKI_NOISE =
  /\b(edit\]|references|external links|track listing|personnel|charts\b|certifications\b|see also)\b/i;

function splitSentences(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 24);
}

function cleanSentence(sentence: string): string {
  return sanitizePublicCopy(
    sentence
      .replace(/\([^)]{30,}\)/g, "")
      .replace(/\[[^\]]+\]/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function isUsefulSentence(sentence: string, albumTitle: string, artistName: string): boolean {
  if (WIKI_NOISE.test(sentence)) return false;
  if (sentence.length < 30 || sentence.length > 320) return false;
  const lower = sentence.toLowerCase();
  const title = albumTitle.toLowerCase();
  const artist = artistName.toLowerCase();
  return lower.includes(title) || lower.includes(artist) || /\b(studio album|debut|recorded|released)\b/i.test(sentence);
}

function pickSourceSentences(excerpts: string[], albumTitle: string, artistName: string): string[] {
  const sentences: string[] = [];
  for (const excerpt of excerpts) {
    for (const sentence of splitSentences(excerpt)) {
      const cleaned = cleanSentence(sentence);
      if (!cleaned || !isUsefulSentence(cleaned, albumTitle, artistName)) continue;
      if (sentences.some((existing) => existing.slice(0, 48) === cleaned.slice(0, 48))) continue;
      sentences.push(cleaned);
      if (sentences.length >= 4) return sentences;
    }
  }
  return sentences;
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function trimToWordRange(text: string, min = 80, max = 160): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= max) return words.join(" ");
  return `${words.slice(0, max).join(" ")}.`;
}

function chartSentence(input: AlbumDescriptionInput): string | null {
  const { b200Peak, chartWeeks, weeksAtNumberOne } = input;
  if (b200Peak == null || chartWeeks <= 0) return null;

  if (weeksAtNumberOne > 0) {
    return `On the Billboard 200, it peaked at #${b200Peak} and spent ${weeksAtNumberOne} week${weeksAtNumberOne === 1 ? "" : "s"} at #1 across ${chartWeeks} total chart weeks.`;
  }
  return `On the Billboard 200, it reached #${b200Peak} and charted for ${chartWeeks} weeks.`;
}

function singlesSentence(singles: string[]): string | null {
  if (singles.length === 0) return null;
  const lead = singles.slice(0, 3).map((title) => `"${title}"`).join(", ");
  return `Major singles from the album include ${lead}.`;
}

function fallbackDescription(input: AlbumDescriptionInput): string {
  const yearPart = input.releaseYear != null ? ` (${input.releaseYear})` : "";
  const trackPart =
    input.trackCount > 0
      ? ` The RetroVerse catalog lists ${input.trackCount} track${input.trackCount === 1 ? "" : "s"} on this release.`
      : "";

  const chartPart = chartSentence(input);
  const singlesPart = singlesSentence(input.majorSinglesFromChart.length > 0 ? input.majorSinglesFromChart : input.source.majorSingles);

  let text = `${input.title}${yearPart} is a ${input.artistName} album in the RetroVerse archive.${trackPart}`;
  if (chartPart) text += ` ${chartPart}`;
  if (singlesPart) text += ` ${singlesPart}`;
  return trimToWordRange(text, 60, 160);
}

/** Deterministic public album summary from stored source excerpts + graph facts. */
export function buildAlbumDescription(input: AlbumDescriptionInput): string {
  const picked = pickSourceSentences(input.source.wikiExcerpts, input.title, input.artistName);

  if (picked.length === 0) {
    return fallbackDescription(input);
  }

  let body = picked.slice(0, 3).join(" ");
  const chartPart = chartSentence(input);
  if (chartPart && !/\bBillboard 200\b/i.test(body) && wordCount(body) < 130) {
    body = `${body} ${chartPart}`;
  }

  const singles = input.majorSinglesFromChart.length > 0 ? input.majorSinglesFromChart : input.source.majorSingles;
  const singlesPart = singlesSentence(singles);
  if (singlesPart && wordCount(body) < 120) {
    body = `${body} ${singlesPart}`;
  }

  const cleaned = sanitizePublicCopy(body);
  if (wordCount(cleaned) < 50) return fallbackDescription(input);
  return trimToWordRange(cleaned, 80, 160);
}
