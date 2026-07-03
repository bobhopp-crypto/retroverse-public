import type { SongControlData } from "@/lib/retroverse-2/song-control";
import type { FactCategory, SongPackage, StoryCard } from "@/lib/ops/intelligence/song-package-types";
import type { TrackPageData } from "@/lib/track/load-track-page";

import { sanitizePublicCopy, sanitizePublicCopyOrNull } from "./public-copy";

export type StoryMediaItem = {
  kind: "cover" | "label" | "video_thumb" | "photo";
  url: string | null;
  alt: string;
  caption?: string | null;
};

export type StoryDisplayCard = {
  id: string;
  title: string | null;
  body: string;
  context: string | null;
  media?: StoryMediaItem[];
};

const CATEGORY_TITLES: Partial<Record<FactCategory, string>> = {
  recording: "Recording",
  video: "Music Video",
  performance: "Live Performance",
  chart: "Chart Milestone",
  cultural_impact: "Cultural Moment",
  tv_film: "TV Appearance",
  artist: "Legacy",
  album: "Album",
  quote: "Quote",
};

const GENERIC_HEADLINE =
  /^(story card \d+|fact|overview|untitled|heart of glass|american pie)$/i;

function isAmericanPie(track: TrackPageData): boolean {
  return track.rvtr.toUpperCase() === "RVTR891825";
}

export function storyCardTitle(card: StoryCard, track: TrackPageData): string | null {
  const headline = card.headline.trim();
  if (
    headline &&
    !GENERIC_HEADLINE.test(headline) &&
    headline.toLowerCase() !== track.title.toLowerCase()
  ) {
    return headline;
  }
  return CATEGORY_TITLES[card.category] ?? null;
}

export type RawStoryCardEntry = {
  card: StoryCard;
  display: StoryDisplayCard;
  rank: number;
};

function cardsFromPackage(pkg: SongPackage, track: TrackPageData): RawStoryCardEntry[] {
  return pkg.storyCards
    .filter((card) => card.rank > 0 && !card.hidden && card.fact.trim())
    .sort((a, b) => a.rank - b.rank)
    .map((card) => ({
      card,
      rank: card.rank,
      display: {
        id: card.id,
        title: storyCardTitle(card, track),
        body: sanitizePublicCopy(card.fact.trim()),
        context: sanitizePublicCopyOrNull(card.supportingContext?.trim() ?? null),
      },
    }));
}

function fallbackFromControl(control: SongControlData | undefined): StoryDisplayCard[] {
  const cards: StoryDisplayCard[] = [];
  const push = (id: string, title: string | null, body: string | null) => {
    const cleaned = body ? sanitizePublicCopy(body) : null;
    if (!cleaned || cleaned.length < 12) return;
    cards.push({ id, title, body: cleaned, context: null });
  };

  push("about-song", null, control?.story.aboutSong ?? null);
  push("about-artist", "Legacy", control?.story.aboutArtist ?? null);
  push("the-year", "The Year", control?.story.theYear ?? null);
  push("explore", null, control?.story.exploreFurther ?? null);

  return cards;
}

function americanPieFallback(): StoryDisplayCard[] {
  return [
    {
      id: "ap-1",
      title: null,
      body: "The song became important because listeners could hear it as both a mystery and a memorial. It gave people a way to talk about rock and roll changing, aging, and losing some of its early innocence.",
      context: null,
    },
    {
      id: "ap-2",
      title: "Recording",
      body: "McLean never reduced the song to a simple key. That openness helped it last: every generation could argue about the symbols while still feeling the sadness underneath them.",
      context: null,
    },
    {
      id: "ap-3",
      title: "Legacy",
      body: "At more than eight minutes, American Pie was not shaped like a normal radio single, but it still became a mass-audience hit — and a song people still treat like shared memory.",
      context: null,
    },
  ];
}

/** Raw package story cards for clustering / chapter assembly. */
export function buildRawStoryCards(
  pkg: SongPackage,
  track: TrackPageData,
): RawStoryCardEntry[] {
  return cardsFromPackage(pkg, track);
}

/** Flat patron-facing cards — used by legacy callers and fallbacks. */
export function buildStoryDisplayCards(
  pkg: SongPackage,
  track: TrackPageData,
  control?: SongControlData,
): StoryDisplayCard[] {
  const fromPackage = cardsFromPackage(pkg, track).map((entry) => entry.display);
  if (fromPackage.length > 0) return fromPackage;

  const fromControl = fallbackFromControl(control);
  if (fromControl.length > 0) return fromControl;

  if (isAmericanPie(track)) return americanPieFallback();

  return [];
}

/** Control / fallback cards as synthetic entries for clustering. */
export function buildFallbackStoryEntries(
  control: SongControlData | undefined,
  track: TrackPageData,
): RawStoryCardEntry[] {
  const displays =
    fallbackFromControl(control).length > 0
      ? fallbackFromControl(control)
      : isAmericanPie(track)
        ? americanPieFallback()
        : [];

  return displays.map((display, index) => ({
    card: {
      id: display.id,
      storyId: display.id,
      rank: index + 1,
      headline: display.title ?? "",
      fact: display.body,
      sourceLabel: "Retroverse",
      sourceUrl: null,
      sourceExcerpt: display.body,
      confidence: 0.5,
      category:
        display.title === "Legacy"
          ? "artist"
          : display.title === "Recording"
            ? "recording"
            : "trivia",
    },
    display,
    rank: index + 1,
  }));
}
