export const COLLECTOR_CARD_SUITS = ["spades", "hearts", "diamonds", "clubs"] as const;
export const COLLECTOR_CARD_RANKS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;
export const COLLECTOR_CARD_TYPES = ["top10", "jack", "queen", "king", "joker"] as const;
export const COLLECTOR_DECK_YEARS = [1974, 1975, 1976, 1977] as const;
export const COLLECTOR_DECK_RANKS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;

export type CollectorCardSuit = (typeof COLLECTOR_CARD_SUITS)[number];
export type CollectorCardRank = (typeof COLLECTOR_CARD_RANKS)[number];
export type CollectorCardType = (typeof COLLECTOR_CARD_TYPES)[number];
export type CollectorDeckYear = (typeof COLLECTOR_DECK_YEARS)[number];
export type CollectorDeckRank = (typeof COLLECTOR_DECK_RANKS)[number];

export type CollectorCardContent = {
  year: number;
  song: string;
  artist: string;
  chartPosition: number | null;
  peak?: number | null;
  weeks?: number | null;
  rvtr: string;
  fact: string;
};

export type CollectorCardPresentation = {
  suit: CollectorCardSuit;
  rank: CollectorCardRank;
  cardType: CollectorCardType;
};

export type CollectorCard = {
  content: CollectorCardContent;
  presentation: CollectorCardPresentation;
};

export const COLLECTOR_CARD_TYPE_LABELS: Record<CollectorCardType, string> = {
  top10: "Top 10 Song",
  jack: "Jack (Cultural Moment)",
  queen: "Queen (Artist Moment)",
  king: "King (Legacy Card)",
  joker: "Joker (Year Card)",
};

export const COLLECTOR_CARD_SUIT_LABELS: Record<CollectorCardSuit, string> = {
  spades: "Spades",
  hearts: "Hearts",
  diamonds: "Diamonds",
  clubs: "Clubs",
};

export const COLLECTOR_DECK_YEAR_SUITS: Record<CollectorDeckYear, CollectorCardSuit> = {
  1974: "hearts",
  1975: "diamonds",
  1976: "clubs",
  1977: "spades",
};

export const COLLECTOR_CARD_EMPTY_CONTENT: CollectorCardContent = {
  year: 1977,
  song: "",
  artist: "",
  chartPosition: null,
  rvtr: "",
  fact: "",
};

export const COLLECTOR_CARD_TEST_SET: CollectorCard[] = [];

export function collectorCardForRetroversePick(year: number, rank: "J" | "Q" | "K"): CollectorCard {
  const cardType = rank === "J" ? "jack" : rank === "Q" ? "queen" : "king";
  const suit = COLLECTOR_DECK_YEAR_SUITS[year as CollectorDeckYear] ?? "spades";
  return {
    content: {
      year,
      song: "",
      artist: "",
      chartPosition: null,
      rvtr: "",
      fact: "Retroverse Pick pending manual selection.",
    },
    presentation: { suit, rank, cardType },
  };
}

export function normalizeCollectorCardContent(raw: unknown): CollectorCardContent {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const chartPosition = Number.parseInt(String(source.chartPosition ?? ""), 10);
  const fact = typeof source.fact === "string" ? source.fact.trim().split(/(?<=[.!?])\s+/)[0] ?? "" : "";
  return {
    year: Number.parseInt(String(source.year ?? "1977"), 10) || 1977,
    song: typeof source.song === "string" ? source.song : "",
    artist: typeof source.artist === "string" ? source.artist : "",
    chartPosition: Number.isFinite(chartPosition) ? chartPosition : null,
    rvtr: typeof source.rvtr === "string" ? source.rvtr.trim() : "",
    fact,
  };
}

export function normalizeCollectorCardPresentation(raw: unknown): CollectorCardPresentation {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const suit = source.suit;
  const rank = source.rank;
  const cardType = source.cardType;
  return {
    suit: COLLECTOR_CARD_SUITS.includes(suit as CollectorCardSuit) ? (suit as CollectorCardSuit) : "spades",
    rank: COLLECTOR_CARD_RANKS.includes(rank as CollectorCardRank) ? (rank as CollectorCardRank) : "1",
    cardType: COLLECTOR_CARD_TYPES.includes(cardType as CollectorCardType)
      ? (cardType as CollectorCardType)
      : "top10",
  };
}
