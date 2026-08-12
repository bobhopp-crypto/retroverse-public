/**
 * Built-in Channel Zero scheduled program — Top 10 Songs of 1969.
 * RVTR ids only; song metadata lives in the canonical graph.
 */
export const TOP_10_SONGS_1969_PROGRAM_ID = "top-10-songs-1969" as const;

/** Billboard 1969 year-end inspired ordering; canonical RVTR ids from the graph. */
export const TOP_10_SONGS_1969_RVTRS = [
  "RVTR318161", // Aquarius Let The Sunshine In — The 5th Dimension
  "RVTR871491", // Sugar Sugar — The Archies
  "RVTR859552", // Crimson And Clover — Tommy James and The Shondells
  "RVTR974030", // I Can't Get Next to You — The Temptations
  "RVTR063240", // Honky Tonk Women — The Rolling Stones
  "RVTR836442", // Everyday People — Sly & the Family Stone
  "RVTR148724", // Dizzy — Tommy Roe
  "RVTR492274", // Hot Fun in the Summertime — Sly & the Family Stone
  "RVTR944817", // Traces — Classics IV
  "RVTR737992", // Get Back — The Beatles
] as const;

/** Operator-facing labels for the built-in Program queue. */
export const TOP_10_SONGS_1969_LABELS: Record<
  (typeof TOP_10_SONGS_1969_RVTRS)[number],
  { title: string; artist: string }
> = {
  RVTR318161: { title: "Aquarius / Let the Sunshine In", artist: "The 5th Dimension" },
  RVTR871491: { title: "Sugar, Sugar", artist: "The Archies" },
  RVTR859552: { title: "Crimson and Clover", artist: "Tommy James and the Shondells" },
  RVTR974030: { title: "I Can't Get Next to You", artist: "The Temptations" },
  RVTR063240: { title: "Honky Tonk Women", artist: "The Rolling Stones" },
  RVTR836442: { title: "Everyday People", artist: "Sly & the Family Stone" },
  RVTR148724: { title: "Dizzy", artist: "Tommy Roe" },
  RVTR492274: { title: "Hot Fun in the Summertime", artist: "Sly & the Family Stone" },
  RVTR944817: { title: "Traces", artist: "Classics IV" },
  RVTR737992: { title: "Get Back", artist: "The Beatles" },
};

/** Fixed epoch keeps slot math deterministic across environments. */
export const TOP_10_SONGS_1969_EPOCH_MS = Date.parse("2026-01-01T00:00:00.000Z");

/** Each song airs for 20 seconds before advancing. */
export const TOP_10_SONGS_1969_ITEM_MS = 20_000;

export type Top10Songs1969Item = {
  programId: typeof TOP_10_SONGS_1969_PROGRAM_ID;
  itemIndex: number;
  rvtr: string;
  slotStartMs: number;
  slotEndMs: number;
};
