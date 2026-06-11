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

  constructor(
    private readonly stablePolls: number,
  ) {}

  private trackKey(track: StableTrack): string {
    return `${track.deck}::${track.filepath}`;
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

    if (
      this.candidate &&
      this.candidate.deck === next.deck &&
      this.candidate.filepath === next.filepath
    ) {
      this.stableCount += 1;
    } else {
      this.candidate = next;
      this.stableCount = 1;
    }

    if (this.stableCount < this.stablePolls) return null;

    const key = this.trackKey(next);
    if (key === this.lastPublishedKey) return null;

    this.lastPublishedKey = key;
    return next;
  }
}
