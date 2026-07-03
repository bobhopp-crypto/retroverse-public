import type { KnowledgeTier } from "./presentation";

export type CollectorLibraryCard = {
  rvtr: string;
  artist: string;
  title: string;
  knowledgeTier: KnowledgeTier;
  researchQuality: number;
  discoveryCount: number;
  lastUpdated: string;
  heroImageUrl: string | null;
  performanceCount: number;
  performanceTitles: string[];
  href: string;
};

export type CollectorLibraryStats = {
  packageCount: number;
  knowledgeTiers: KnowledgeTier[];
  averageCompletion: number;
};

export type CollectorLibraryIndex = {
  packages: CollectorLibraryCard[];
  recent: CollectorLibraryCard[];
  alphabetical: CollectorLibraryCard[];
  stats: CollectorLibraryStats;
};

export function filterLibraryCards(
  cards: CollectorLibraryCard[],
  query: string,
): CollectorLibraryCard[] {
  const q = query.trim().toLowerCase();
  if (!q) return cards;
  return cards.filter(
    (card) =>
      card.artist.toLowerCase().includes(q) ||
      card.title.toLowerCase().includes(q) ||
      card.rvtr.toLowerCase().includes(q),
  );
}
