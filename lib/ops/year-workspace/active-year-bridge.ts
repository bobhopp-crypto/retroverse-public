export type ActiveYearEntry = {
  title: string;
  peak: number | null;
};

export type ActiveYearConnections = {
  focusYear: number;
  artist: string;
  songTitle: string;
  artistNorm: string;
  titleNorm: string;
  activeYears: number[];
  /** Artist Hot 100 hits per year (all peaks). */
  artistByYear: Record<number, ActiveYearEntry[]>;
  /** Same song title Hot 100 hits per year when found. */
  songByYear: Record<number, ActiveYearEntry[]>;
  /** @deprecated Use artistByYear */
  byYear: Record<number, ActiveYearEntry[]>;
};

export type ActiveYearBridgeTier = "none" | "single" | "full";

export type ActiveYearBridge = {
  /** Active years (excluding focus) with artist Hot 100 activity. */
  bridgeYears: number[];
  tier: ActiveYearBridgeTier;
};

export function normArtist(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/\s+/g, " ");
}

export function normTitle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .trim();
}

export function bridgeForRow(
  bridges: Record<string, ActiveYearBridge> | undefined,
  row: { artist: string },
): ActiveYearBridge | null {
  if (!bridges) return null;
  return bridges[normArtist(row.artist)] ?? null;
}

export function bridgeRank(bridge: ActiveYearBridge | null | undefined): number {
  if (!bridge || bridge.bridgeYears.length === 0) return 2;
  if (bridge.tier === "full") return 0;
  return 1;
}

export function bridgeFromArtistYears(
  focusYear: number,
  activeYears: number[],
  artistByYear: Record<number, ActiveYearEntry[]>,
): ActiveYearBridge {
  const otherYears = activeYears.filter((y) => y !== focusYear);
  const bridgeYears = otherYears.filter((y) => (artistByYear[y] ?? []).length > 0);
  let tier: ActiveYearBridgeTier = "none";
  if (bridgeYears.length === 1) tier = "single";
  else if (bridgeYears.length >= otherYears.length && otherYears.length > 0) {
    tier = "full";
  } else if (bridgeYears.length > 1) {
    tier = "full";
  }
  return { bridgeYears, tier };
}

function hasAnyActivity(byYear: Record<number, ActiveYearEntry[]>): boolean {
  return Object.values(byYear).some((hits) => hits.length > 0);
}

export function connectionsHaveActivity(conn: ActiveYearConnections): boolean {
  return hasAnyActivity(conn.artistByYear) || hasAnyActivity(conn.songByYear);
}

/** Years with hits for panel rendering (skip empty years). */
export function yearsWithArtistHits(
  conn: ActiveYearConnections,
): Array<{ year: number; hits: ActiveYearEntry[] }> {
  return conn.activeYears
    .filter((y) => (conn.artistByYear[y] ?? []).length > 0)
    .map((y) => ({ year: y, hits: conn.artistByYear[y] ?? [] }));
}

export function yearsWithSongHits(
  conn: ActiveYearConnections,
): Array<{ year: number; hits: ActiveYearEntry[] }> {
  return conn.activeYears
    .filter((y) => (conn.songByYear[y] ?? []).length > 0)
    .map((y) => ({ year: y, hits: conn.songByYear[y] ?? [] }));
}
