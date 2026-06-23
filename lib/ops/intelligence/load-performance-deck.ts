import { hydratePackageIntel } from "./package-intel";
import { loadSongPackage, normalizePackageRvtr } from "./song-package-store";
import type { CandidateFact, SongPackage, StoryCard } from "./song-package-types";

const RVTR_RE = /^RVTR\d{6}$/;

export type PerformanceDeckStoryCard = {
  type: "story";
  id: string;
  headline: string;
  fact: string;
  supportingContext: string | null;
  sourceLabel: string;
  sourceUrl: string | null;
  category: StoryCard["category"];
  rank: number;
  promoted?: boolean;
};

export type PerformanceDeckCard =
  | {
      type: "hero";
      id: "hero";
      title: string;
      artist: string;
      rvtr: string;
      year: number | null;
      albumTitle: string | null;
      coverUrl: string | null;
      peakHot100: number | null;
      chartWeeks: number | null;
      label: string | null;
      hasVdjMedia: boolean;
    }
  | PerformanceDeckStoryCard
  | {
      type: "chart";
      id: "chart";
      peakHot100: number | null;
      chartWeeks: number | null;
      entries: Array<{ chart: string; peak: number | null; weeks: number | null; detail: string | null }>;
    }
  | {
      type: "artist";
      id: "artist";
      artist: string;
      facts: Array<{ id: string; text: string; sourceLabel: string; sourceUrl: string | null }>;
    }
  | {
      type: "related-artists";
      id: "related-artists";
      artists: string[];
    }
  | {
      type: "related-songs";
      id: "related-songs";
      songs: Array<{ rvtr: string; title: string; artist?: string | null }>;
    }
  | {
      type: "bobs-note";
      id: "bobs-note";
      note: string | null;
    };

export type PerformanceDeckModel = {
  rvtr: string;
  title: string;
  artist: string;
  status: "published" | "review";
  cards: PerformanceDeckCard[];
};

function sourceLabel(fact: CandidateFact): string {
  if (fact.sourceType === "canonical") return "Retroverse";
  if (fact.sourceUrl?.includes("wikipedia.org")) return "Wikipedia";
  return fact.sourceId.startsWith("wiki") ? "Wikipedia" : "Research";
}

function activeStoryCards(pkg: SongPackage): PerformanceDeckStoryCard[] {
  const cards = pkg.storyCards
    .filter((card) => card.rank > 0 && !card.hidden)
    .sort((a, b) => a.rank - b.rank)
    .map((card): PerformanceDeckStoryCard => ({
      type: "story",
      id: card.id,
      headline: card.headline,
      fact: card.fact,
      supportingContext: card.supportingContext ?? null,
      sourceLabel: card.sourceLabel,
      sourceUrl: card.sourceUrl,
      category: card.category,
      rank: card.rank,
      promoted: /bob talbert/i.test(`${card.headline} ${card.fact}`),
    }));

  const promoted = cards.filter((card) => card.promoted);
  const rest = cards.filter((card) => !card.promoted);
  return [...promoted, ...rest];
}

function activeArtistFacts(pkg: SongPackage) {
  return pkg.candidateFacts
    .filter((fact) => fact.category === "artist" && fact.reviewStatus === "approved" && !fact.mergedIntoId)
    .sort((a, b) => b.importance - a.importance || b.confidence - a.confidence)
    .slice(0, 3)
    .map((fact) => ({
      id: fact.id,
      text: fact.factText,
      sourceLabel: sourceLabel(fact),
      sourceUrl: fact.sourceUrl,
    }));
}

function chartEntries(pkg: SongPackage) {
  return pkg.intel.chartHistory.filter(
    (entry) => entry.peak != null || entry.weeks != null || entry.detail?.trim(),
  );
}

function relatedSongsFromPackage(pkg: SongPackage): Array<{ rvtr: string; title: string; artist?: string | null }> {
  const raw = pkg as SongPackage & {
    relatedSongs?: unknown;
    metadata: SongPackage["metadata"] & { relatedSongs?: unknown };
  };
  const source = Array.isArray(raw.metadata.relatedSongs)
    ? raw.metadata.relatedSongs
    : Array.isArray(raw.relatedSongs)
      ? raw.relatedSongs
      : [];

  return source
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const obj = entry as { rvtr?: unknown; title?: unknown; artist?: unknown };
      const rvtr = typeof obj.rvtr === "string" ? obj.rvtr.trim().toUpperCase() : "";
      const title = typeof obj.title === "string" ? obj.title.trim() : "";
      if (!RVTR_RE.test(rvtr) || !title) return null;
      return {
        rvtr,
        title,
        artist: typeof obj.artist === "string" && obj.artist.trim() ? obj.artist.trim() : null,
      };
    })
    .filter((entry): entry is { rvtr: string; title: string; artist: string | null } => Boolean(entry));
}

export async function loadPerformanceDeck(rvtrParam: string): Promise<PerformanceDeckModel | null> {
  const rvtr = normalizePackageRvtr(rvtrParam);
  if (!rvtr) return null;

  const raw = await loadSongPackage(rvtr);
  if (!raw || (raw.status !== "published" && raw.status !== "review")) return null;

  const status = raw.status;
  const pkg = hydratePackageIntel(raw);
  const meta = pkg.metadata;
  const cards: PerformanceDeckCard[] = [
    {
      type: "hero",
      id: "hero",
      title: meta.title,
      artist: meta.artist,
      rvtr: pkg.rvtr,
      year: meta.year,
      albumTitle: meta.albumTitle,
      coverUrl: meta.coverUrl,
      peakHot100: meta.peakHot100,
      chartWeeks: meta.chartWeeks,
      label: pkg.intel.label,
      hasVdjMedia: meta.hasVdjMedia,
    },
    ...activeStoryCards(pkg),
  ];

  const chart = chartEntries(pkg);
  if (meta.peakHot100 != null || meta.chartWeeks != null || chart.length > 0) {
    cards.push({
      type: "chart",
      id: "chart",
      peakHot100: meta.peakHot100,
      chartWeeks: meta.chartWeeks,
      entries: chart.map((entry) => ({
        chart: entry.chart,
        peak: entry.peak,
        weeks: entry.weeks,
        detail: entry.detail ?? null,
      })),
    });
  }

  const artistFacts = activeArtistFacts(pkg);
  if (artistFacts.length > 0) {
    cards.push({ type: "artist", id: "artist", artist: meta.artist, facts: artistFacts });
  }

  if (meta.relatedArtists.length > 0) {
    cards.push({ type: "related-artists", id: "related-artists", artists: meta.relatedArtists });
  }

  const relatedSongs = relatedSongsFromPackage(pkg);
  if (relatedSongs.length > 0) {
    cards.push({ type: "related-songs", id: "related-songs", songs: relatedSongs });
  }

  cards.push({ type: "bobs-note", id: "bobs-note", note: null });

  return {
    rvtr: pkg.rvtr,
    title: meta.title,
    artist: meta.artist,
    status,
    cards,
  };
}
