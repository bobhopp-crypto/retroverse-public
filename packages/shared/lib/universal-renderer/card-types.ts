/**
 * Universal Mobile Experience Renderer — Card Types
 *
 * Every card in the renderer is one of these discriminated union members.
 * The renderer inspects a SongPackage and builds an ordered card sequence
 * automatically. Cards with insufficient data are simply not emitted.
 *
 * Adding a new card type:
 *   1. Add a member to the union below.
 *   2. Add selection logic in select-cards.ts.
 *   3. Register a component in UniversalRenderer.tsx's CARD_REGISTRY.
 */

/** Full-bleed hero — always first. Requires: artist + title. */
export type HeroCard = {
  kind: "hero";
  artist: string;
  title: string;
  year: number | null;
  coverUrl: string | null;
};

/**
 * Editorial story card — one significant headline + body text.
 * Requires: headline + at least one sentence of supporting context.
 */
export type StoryCard = {
  kind: "story";
  kicker: string;
  headline: string;
  body: string;
  category: string;
};

/**
 * Quote card — a single pulled quote rendered large.
 * Requires: a storyCard whose fact reads like a quote (contains " — " or is
 * in the "quote" category).
 */
export type QuoteCard = {
  kind: "quote";
  quote: string;
  attribution: string;
};

/**
 * Charts card — peak positions and run length across known charts.
 * Requires: at least one chartHistory entry.
 */
export type ChartsCard = {
  kind: "charts";
  entries: Array<{
    chart: string;
    peak: number | null;
    weeks: number | null;
  }>;
  peakHot100: number | null;
  chartWeeks: number | null;
  year: number | null;
  albumTitle: string | null;
};

/**
 * Album card — cover art + album identity.
 * Requires: albumTitle (coverUrl is optional; falls back to gradient tile).
 */
export type AlbumCard = {
  kind: "album";
  albumTitle: string;
  year: number | null;
  coverUrl: string | null;
  artist: string;
};

/**
 * Timeline card — ordered events from the song's history.
 * Requires: at least 2 meaningful timeline events.
 */
export type TimelineCard = {
  kind: "timeline";
  events: Array<{
    year: number | null;
    title: string;
    description: string;
  }>;
};

/**
 * Facts card — "Did You Know" bullet list.
 * Requires: at least 2 interesting story cards after the hero.
 */
export type FactsCard = {
  kind: "facts";
  facts: string[];
};

/**
 * Library stats card — play count, chart peak, ownership status.
 * Requires: at least one non-null stat field.
 */
export type LibraryStatsCard = {
  kind: "library_stats";
  playCount: number | null;
  peakHot100: number | null;
  chartWeeks: number | null;
  hasVdjMedia: boolean;
};

/**
 * Credits card — always last. Retroverse brand + RVTR identity.
 * Always emitted.
 */
export type CreditsCard = {
  kind: "credits";
  artist: string;
  title: string;
  rvtr: string;
  year: number | null;
};

/** Discriminated union of all possible renderer cards. */
export type RendererCard =
  | HeroCard
  | StoryCard
  | QuoteCard
  | ChartsCard
  | AlbumCard
  | TimelineCard
  | FactsCard
  | LibraryStatsCard
  | CreditsCard;

export type RendererCardKind = RendererCard["kind"];
