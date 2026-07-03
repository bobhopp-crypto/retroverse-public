import type { SongPackage } from "@/lib/ops/intelligence/song-package-types";

import type { HeroPromptInput } from "./types";

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "in",
  "on",
  "at",
  "to",
  "for",
  "with",
  "by",
  "from",
  "is",
  "was",
  "were",
  "it",
  "its",
  "that",
  "this",
]);

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (!item.trim() || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}

function extractNounPhrases(text: string, limit = 4): string[] {
  const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g) ?? [];
  return unique(matches).slice(0, limit);
}

function moodFromPackage(pkg: SongPackage): string[] {
  const moods: string[] = [];
  const tags = pkg.metadata.tags.map((tag) => tag.trim()).filter(Boolean);
  if (tags.length > 0) moods.push(...tags.slice(0, 3));

  const genre = pkg.metadata.vdjSnapshot?.genre?.trim();
  if (genre) moods.push(`${genre} energy`);

  for (const card of pkg.storyCards.filter((c) => c.rank > 0 && !c.hidden).slice(0, 2)) {
    if (/surprise|shock|unexpected/i.test(card.headline)) moods.push("surprise");
    if (/love|heart|romance/i.test(card.fact)) moods.push("romantic tension");
    if (/rebell|protest|dissatisf/i.test(card.fact)) moods.push("restless defiance");
    if (/celebr|triumph|number one|#1/i.test(card.fact)) moods.push("triumph");
  }

  if (moods.length === 0) moods.push("cinematic nostalgia");
  return unique(moods).slice(0, 4);
}

function storiesFromPackage(pkg: SongPackage): string[] {
  return pkg.storyCards
    .filter((c) => c.rank > 0 && !c.hidden)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3)
    .map((c) => `${c.headline}: ${c.fact.replace(/\s+/g, " ").trim()}`);
}

function objectsFromPackage(pkg: SongPackage): string[] {
  const corpus = [
    ...pkg.storyCards.map((c) => `${c.headline} ${c.fact}`),
    ...pkg.candidateFacts
      .filter((f) => f.reviewStatus !== "rejected")
      .map((f) => f.factText),
  ].join(" ");

  const keywords = corpus.match(/\b(guitar|piano|microphone|stage|studio|vinyl|radio|highway|city|neon|diner|ocean|rain|night|car|train|mirror|lightning|smoke|spotlight)\b/gi) ?? [];
  return unique(keywords.map((w) => w.toLowerCase())).slice(0, 6);
}

function locationsFromPackage(pkg: SongPackage): string[] {
  const corpus = [
    ...pkg.storyCards.map((c) => c.fact),
    ...pkg.researchVault.map((v) => v.excerpt),
  ].join(" ");

  const fromProper = extractNounPhrases(corpus, 6).filter(
    (phrase) => !phrase.match(/Billboard|Hot 100|Retroverse|Wikipedia/i),
  );

  const keywords = corpus.match(/\b(London|Los Angeles|New York|Nashville|Memphis|Detroit|Chicago|Miami|Hollywood|England|America)\b/g) ?? [];
  return unique([...fromProper, ...keywords]).slice(0, 5);
}

function historicalContextFromPackage(pkg: SongPackage): string[] {
  const ctx: string[] = [];
  const meta = pkg.metadata;

  if (meta.year) ctx.push(`Release era: ${meta.year}.`);
  if (meta.peakHot100 != null) {
    ctx.push(`Chart legacy: #${meta.peakHot100} on Billboard Hot 100${meta.chartWeeks ? ` (${meta.chartWeeks} weeks)` : ""}.`);
  }
  if (meta.albumTitle) ctx.push(`Album context: ${meta.albumTitle}.`);

  for (const event of pkg.intel.timelineEvents.slice(0, 2)) {
    if (event.title && event.description) {
      ctx.push(`${event.title}: ${event.description}`);
    }
  }

  return unique(ctx).slice(0, 4);
}

export function extractHeroPromptInput(pkg: SongPackage): HeroPromptInput {
  const genre = pkg.metadata.vdjSnapshot?.genre?.trim() || null;

  return {
    title: pkg.metadata.title,
    artist: pkg.metadata.artist,
    year: pkg.metadata.year,
    albumTitle: pkg.metadata.albumTitle,
    genre,
    mood: moodFromPackage(pkg),
    stories: storiesFromPackage(pkg),
    objects: objectsFromPackage(pkg),
    locations: locationsFromPackage(pkg),
    historicalContext: historicalContextFromPackage(pkg),
  };
}

export function buildHeroPrompt(input: HeroPromptInput): string {
  const era = input.year ? `${input.year}` : "its era";
  const lines = [
    "Portrait mobile background. Vertical 9:16 composition. 1080×1920.",
    "Cinematic atmospheric scene inspired by the song — symbolism over literal depiction.",
    "",
    `Song: "${input.title}" by ${input.artist} (${era}).`,
  ];

  if (input.genre) lines.push(`Genre feel: ${input.genre}.`);
  if (input.mood.length > 0) lines.push(`Mood: ${input.mood.join(", ")}.`);
  if (input.historicalContext.length > 0) {
    lines.push(`Historical context: ${input.historicalContext.join(" ")}`);
  }
  if (input.stories.length > 0) {
    lines.push("", "Story atmosphere (abstract, do not illustrate literally):");
    for (const story of input.stories) lines.push(`- ${story}`);
  }
  if (input.objects.length > 0) {
    lines.push(`Symbolic objects: ${input.objects.join(", ")}.`);
  }
  if (input.locations.length > 0) {
    lines.push(`Suggested settings: ${input.locations.join(", ")}.`);
  }

  lines.push(
    "",
    "Visual language: rich color, depth, texture, editorial portrait framing, designed as a phone hero background.",
    "Avoid copying album artwork. Avoid celebrity likeness. Avoid readable faces of real people.",
    "Do NOT include: text, logos, album covers, watermarks, typography, brand marks.",
  );

  return lines.join("\n");
}

export function buildHeroPromptFromPackage(pkg: SongPackage): string {
  return buildHeroPrompt(extractHeroPromptInput(pkg));
}
