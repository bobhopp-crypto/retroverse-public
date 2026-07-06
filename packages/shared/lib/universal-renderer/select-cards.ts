/**
 * Universal Mobile Experience Renderer — Automatic Card Selector
 *
 * Inspects a SongPackage and returns an ordered sequence of RendererCards.
 * Cards are only emitted when sufficient data exists. No empty cards are
 * ever returned. The sequence always starts with HeroCard and ends with
 * CreditsCard — everything in between scales with data richness.
 *
 * Level 0 (always):   hero + credits
 * Level 1 (+stories): story cards from storyCards
 * Level 2 (+charts):  charts card, album card
 * Level 3 (+timeline):timeline card
 * Level 4 (+facts):   facts card, library stats card
 */

import type { SongPackage, StoryCard } from "@/lib/ops/intelligence/song-package-types";

import type {
  AlbumCard,
  ChartsCard,
  CreditsCard,
  FactsCard,
  HeroCard,
  LibraryStatsCard,
  QuoteCard,
  RendererCard,
  StoryCard as StoryCardType,
  TimelineCard,
} from "./card-types";

/** Minimum confidence to include a story card in the experience. */
const MIN_STORY_CONFIDENCE = 0.65;

/** Minimum description length for a timeline event to be worth showing. */
const MIN_TIMELINE_DESC_LENGTH = 20;

/** Fact texts that are clearly just internal Retroverse identifiers. */
const NOISE_PATTERNS = [
  /retroverse track identity/i,
  /rvtr\d{6}/i,
  /canonical metadata for/i,
  /canonical record for/i,
];

function isNoisyText(text: string): boolean {
  return NOISE_PATTERNS.some((re) => re.test(text));
}

function pickStoryBody(card: StoryCard): string {
  if (card.supportingContext && card.supportingContext.length > 30) {
    return card.supportingContext;
  }
  if (!isNoisyText(card.fact) && card.fact.length > 20) {
    return card.fact;
  }
  return "";
}

/** True if the fact text looks like a quote (has an attribution marker). */
function looksLikeQuote(text: string): boolean {
  return /[""].*[""]/.test(text) || text.includes(" — ") || text.startsWith('"');
}

export function selectCards(pkg: SongPackage): RendererCard[] {
  const cards: RendererCard[] = [];
  const { metadata, storyCards, intel } = pkg;

  // ── 1. Hero (always) ────────────────────────────────────────────
  const hero: HeroCard = {
    kind: "hero",
    artist: metadata.artist,
    title: metadata.title,
    year: metadata.year,
    coverUrl: metadata.coverUrl ?? null,
  };
  cards.push(hero);

  // ── 2. Story cards (Level 1) ─────────────────────────────────────
  // Skip the "cover" card (rank 0, storyId "cover") — that's just metadata.
  const eligibleStories = storyCards
    .filter((c) => c.storyId !== "cover" && c.confidence >= MIN_STORY_CONFIDENCE)
    .sort((a, b) => a.rank - b.rank);

  // Attempt one quote card from a high-confidence quote/artist fact
  let quoteEmitted = false;
  for (const card of eligibleStories) {
    if (!quoteEmitted && card.category === "quote" && looksLikeQuote(card.fact)) {
      const q: QuoteCard = {
        kind: "quote",
        quote: card.fact,
        attribution: metadata.artist,
      };
      cards.push(q);
      quoteEmitted = true;
      continue;
    }

    const body = pickStoryBody(card);
    if (!isNoisyText(card.headline) && body.length >= 30) {
      const s: StoryCardType = {
        kind: "story",
        kicker: categoryKicker(card.category),
        headline: card.headline,
        body,
        category: card.category,
      };
      cards.push(s);
    }

    // Cap at 4 story/quote cards to keep the deck from being too long
    const storyCount = cards.filter((c) => c.kind === "story" || c.kind === "quote").length;
    if (storyCount >= 4) break;
  }

  // ── 3. Charts card (Level 2) ─────────────────────────────────────
  if (intel.chartHistory.length > 0 || metadata.peakHot100 != null) {
    const c: ChartsCard = {
      kind: "charts",
      entries: intel.chartHistory.map((e) => ({
        chart: e.chart,
        peak: e.peak,
        weeks: e.weeks,
      })),
      peakHot100: metadata.peakHot100,
      chartWeeks: metadata.chartWeeks,
      year: metadata.year,
      albumTitle: metadata.albumTitle,
    };
    cards.push(c);
  }

  // ── 4. Album card (Level 2) ───────────────────────────────────────
  if (metadata.albumTitle) {
    const a: AlbumCard = {
      kind: "album",
      albumTitle: metadata.albumTitle,
      year: metadata.year,
      coverUrl: metadata.coverUrl ?? null,
      artist: metadata.artist,
    };
    cards.push(a);
  }

  // ── 5. Timeline card (Level 3) ────────────────────────────────────
  const meaningfulEvents = intel.timelineEvents.filter(
    (e) =>
      e.description.length >= MIN_TIMELINE_DESC_LENGTH &&
      !isNoisyText(e.description) &&
      !isNoisyText(e.title),
  );
  if (meaningfulEvents.length >= 2) {
    const t: TimelineCard = {
      kind: "timeline",
      events: meaningfulEvents.slice(0, 6).map((e) => ({
        year: e.year,
        title: e.title,
        description: e.description,
      })),
    };
    cards.push(t);
  }

  // ── 6. Facts card (Level 4) ───────────────────────────────────────
  // Collect leftover story cards that didn't make the editorial cut but
  // are still interesting as short facts.
  const usedHeadlines = new Set(
    cards.filter((c): c is StoryCardType => c.kind === "story").map((c) => c.headline),
  );
  const factTexts = eligibleStories
    .filter((c) => !usedHeadlines.has(c.headline) && !isNoisyText(c.fact))
    .map((c) => c.fact)
    .filter((t) => t.length >= 20 && t.length <= 280)
    .slice(0, 5);

  if (factTexts.length >= 2) {
    const f: FactsCard = { kind: "facts", facts: factTexts };
    cards.push(f);
  }

  // ── 7. Library stats card (Level 4) ──────────────────────────────
  const hasStats =
    metadata.playCount != null || metadata.peakHot100 != null || metadata.hasVdjMedia;
  if (hasStats) {
    const ls: LibraryStatsCard = {
      kind: "library_stats",
      playCount: metadata.playCount,
      peakHot100: metadata.peakHot100,
      chartWeeks: metadata.chartWeeks,
      hasVdjMedia: metadata.hasVdjMedia,
    };
    cards.push(ls);
  }

  // ── 8. Credits (always last) ──────────────────────────────────────
  const cr: CreditsCard = {
    kind: "credits",
    artist: metadata.artist,
    title: metadata.title,
    rvtr: metadata.rvtr,
    year: metadata.year,
  };
  cards.push(cr);

  return cards;
}

function categoryKicker(category: string): string {
  const map: Record<string, string> = {
    recording: "Recording",
    video: "Music Video",
    performance: "Live Performance",
    chart: "Charts",
    quote: "In Their Words",
    artist: "Artist Story",
    album: "Album",
    cultural_impact: "Cultural Impact",
    tv_film: "On Screen",
    trivia: "Did You Know",
  };
  return map[category] ?? "Song Story";
}
