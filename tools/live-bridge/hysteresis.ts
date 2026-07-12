import type { VdjDeckSnapshot } from "./vdj";

export type StableTrack = {
  deck: number;
  filepath: string;
  artist: string;
  title: string;
};

function logHysteresis(message: string, detail: Record<string, unknown>): void {
  console.log(`[live-bridge/hysteresis] ${message}`, detail);
}

export class AudibleDeckHysteresis {
  private candidate: StableTrack | null = null;
  private stableCount = 0;
  private lastPublishedKey: string | null = null;

  constructor(
    private readonly stablePolls: number,
  ) {}

  reset(): void {
    this.candidate = null;
    this.stableCount = 0;
    this.lastPublishedKey = null;
  }

  private trackKey(track: StableTrack): string {
    return `${track.deck}::${track.filepath}::${track.artist}::${track.title}`;
  }

  private snapshot(
    next: StableTrack | null,
    key: string | null,
    identityMatched: boolean | null,
    requiredStable: number | null,
  ): Record<string, unknown> {
    return {
      candidateDeck: this.candidate?.deck ?? null,
      candidateFilepath: this.candidate?.filepath ?? null,
      candidateArtist: this.candidate?.artist ?? null,
      candidateTitle: this.candidate?.title ?? null,
      nextDeck: next?.deck ?? null,
      nextFilepath: next?.filepath ?? null,
      nextArtist: next?.artist ?? null,
      nextTitle: next?.title ?? null,
      stableCount: this.stableCount,
      requiredStable,
      lastPublishedKey: this.lastPublishedKey,
      trackKey: key,
      identityMatched,
    };
  }

  observe(deck: VdjDeckSnapshot | null): StableTrack | null {
    if (!deck || !deck.filepath.trim() || !deck.artist.trim() || !deck.title.trim()) {
      logHysteresis("return null", {
        ...this.snapshot(null, null, null, null),
        reason: "missing_deck_or_metadata",
        incomingDeck: deck?.deck ?? null,
        incomingFilepath: deck?.filepath ?? null,
        incomingArtist: deck?.artist ?? null,
        incomingTitle: deck?.title ?? null,
      });
      this.candidate = null;
      this.stableCount = 0;
      return null;
    }

    const priorCandidate = this.candidate
      ? {
          deck: this.candidate.deck,
          filepath: this.candidate.filepath,
          artist: this.candidate.artist,
          title: this.candidate.title,
        }
      : null;

    const next: StableTrack = {
      deck: deck.deck,
      filepath: deck.filepath.trim(),
      artist: deck.artist.trim(),
      title: deck.title.trim(),
    };

    const key = this.trackKey(next);

    const identityMatched = Boolean(
      priorCandidate &&
        priorCandidate.deck === next.deck &&
        priorCandidate.filepath === next.filepath &&
        priorCandidate.artist === next.artist &&
        priorCandidate.title === next.title,
    );

    if (identityMatched) {
      this.stableCount += 1;
    } else {
      this.candidate = next;
      this.stableCount = 1;
    }

    const requiredStable = this.lastPublishedKey === null ? this.stablePolls : 1;

    if (key === this.lastPublishedKey) {
      logHysteresis("return null", {
        ...this.snapshot(next, key, identityMatched, requiredStable),
        reason: "already_published_key",
      });
      return null;
    }

    if (this.stableCount < requiredStable) {
      logHysteresis("return null", {
        ...this.snapshot(next, key, identityMatched, requiredStable),
        reason: "stable_count_below_required",
      });
      return null;
    }

    this.lastPublishedKey = key;
    logHysteresis("return stable track", {
      ...this.snapshot(next, key, identityMatched, requiredStable),
      reason: "publish_ready",
    });
    return next;
  }
}
