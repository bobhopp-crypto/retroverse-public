import type { VdjDeckSnapshot } from "./vdj";

export type StableTrack = {
  deck: number;
  filepath: string;
  artist: string;
  title: string;
};

export class AudibleDeckHysteresis {
  private candidate: StableTrack | null = null;
  private stableCount = 0;
  private lastPublishedKey: string | null = null;
  private lastPublishedAt = 0;

  constructor(
    private readonly stablePolls: number,
    private readonly refreshMs = 60_000,
  ) {}

  reset(): void {
    this.candidate = null;
    this.stableCount = 0;
    this.lastPublishedKey = null;
    this.lastPublishedAt = 0;
  }

  private trackKey(track: StableTrack): string {
    return `${track.deck}::${track.filepath}::${track.artist}::${track.title}`;
  }

  observe(deck: VdjDeckSnapshot | null): StableTrack | null {
    if (!deck || !deck.filepath.trim() || !deck.artist.trim() || !deck.title.trim()) {
      this.candidate = null;
      this.stableCount = 0;
      return null;
    }

    const next: StableTrack = {
      deck: deck.deck,
      filepath: deck.filepath.trim(),
      artist: deck.artist.trim(),
      title: deck.title.trim(),
    };

    const key = this.trackKey(next);

    if (
      this.candidate &&
      this.candidate.deck === next.deck &&
      this.candidate.filepath === next.filepath &&
      this.candidate.artist === next.artist &&
      this.candidate.title === next.title
    ) {
      this.stableCount += 1;
    } else {
      this.candidate = next;
      this.stableCount = 1;
    }

    if (
      key === this.lastPublishedKey &&
      Date.now() - this.lastPublishedAt < this.refreshMs
    ) {
      return null;
    }

    // First publish after start needs debounce; track changes publish immediately.
    const requiredStable = this.lastPublishedKey === null ? this.stablePolls : 1;
    if (this.stableCount < requiredStable) return null;

    this.lastPublishedKey = key;
    this.lastPublishedAt = Date.now();
    return next;
  }
}
