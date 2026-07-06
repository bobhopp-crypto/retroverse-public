export type VdjDeckSnapshot = {
  deck: number;
  filepath: string;
  artist: string;
  title: string;
  /** Optional — not used for deck selection in OSC bridge. */
  audible: boolean;
  elapsedMs: number;
};

export type CrossfaderPickOptions = {
  low: number;
  high: number;
  lastDeck: number | null;
};

/**
 * Pick the deck VirtualDJ is actually outputting.
 *
 * Prefer `is_audible` — crossfader position alone can point at a loaded but
 * silent deck while the other deck is on air (stale metadata).
 * During blends (both audible), fall back to crossfader dead-zone logic.
 */
export function pickActiveDeck(
  decks: VdjDeckSnapshot[],
  crossfaderResult: number,
  opts: CrossfaderPickOptions,
): VdjDeckSnapshot | null {
  const loaded = decks.filter(
    (d) => d.filepath.trim() && d.artist.trim() && d.title.trim(),
  );
  if (loaded.length === 0) return null;
  if (loaded.length === 1) return loaded[0]!;

  const audible = loaded.filter((d) => d.audible);
  if (audible.length === 1) return audible[0]!;
  if (audible.length > 1) {
    return pickCrossfaderDeck(audible, crossfaderResult, opts) ?? audible[0]!;
  }

  return pickCrossfaderDeck(loaded, crossfaderResult, opts);
}

/**
 * Pick the on-air deck from crossfader result.
 * Uses a dead-zone band (default 45–55) to avoid flip-flopping during blends.
 */
export function pickCrossfaderDeck(
  decks: VdjDeckSnapshot[],
  crossfaderResult: number,
  opts: CrossfaderPickOptions,
): VdjDeckSnapshot | null {
  const loaded = decks.filter(
    (d) => d.filepath.trim() && d.artist.trim() && d.title.trim(),
  );
  if (loaded.length === 0) return null;
  if (loaded.length === 1) return loaded[0]!;

  let deckNum: number | null = null;
  if (crossfaderResult <= opts.low) {
    deckNum = 1;
  } else if (crossfaderResult >= opts.high) {
    deckNum = 2;
  } else if (opts.lastDeck === 1 || opts.lastDeck === 2) {
    deckNum = opts.lastDeck;
  } else if (crossfaderResult < 50) {
    deckNum = 1;
  } else {
    deckNum = 2;
  }

  const picked = decks.find((d) => d.deck === deckNum && d.filepath.trim());
  return picked ?? loaded[0] ?? null;
}
