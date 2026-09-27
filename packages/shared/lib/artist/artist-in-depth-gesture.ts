import { primaryLabelArtist, starterArtistHref } from "@/lib/artist/label-artist";

const CANONICAL_ARTIST_HREF = /^\/artist\/(?:RVAR\d{6}|\d+)$/i;
const RVTR_RE = /^RVTR\d{6}$/i;
const PLACEHOLDER_ARTIST = /^(virtualdj|unknown artist|this artist|current song unavailable)$/i;

const SWIPE_MIN_PX = 84;
const SWIPE_MAX_MS = 700;
const SWIPE_VERTICAL_RATIO = 1.35;
const SCROLL_TOP_SLOP_PX = 12;

export type ArtistInDepthHrefInput = {
  artistHref?: string | null;
  rvtr?: string | null;
  artistName?: string | null;
};

export type DownwardSwipeInput = {
  dx: number;
  dy: number;
  elapsedMs: number;
  scrollTop?: number;
  requireScrollTop?: boolean;
};

function unlinkedArtistHref(name?: string | null): string {
  const clean = name?.trim().replace(/\s+/g, " ") ?? "";
  if (!clean || PLACEHOLDER_ARTIST.test(clean)) return "/artist/from-song/unlinked";
  return `/artist/from-song/unlinked?name=${encodeURIComponent(clean.slice(0, 120))}`;
}

/** Canonical artist route, the song resolver, or a minimal archive page. Never a name slug. */
export function artistInDepthHref(input: ArtistInDepthHrefInput): string {
  const raw = input.artistHref?.trim() ?? "";
  const path = raw.split(/[?#]/)[0] ?? "";
  if (CANONICAL_ARTIST_HREF.test(path)) return path;

  const primary = primaryLabelArtist(input.artistName ?? "");
  const starter = starterArtistHref(primary);
  if (starter) return starter;

  const rvtr = input.rvtr?.trim().toUpperCase() ?? "";
  if (RVTR_RE.test(rvtr)) return `/artist/from-song/${rvtr}`;
  return unlinkedArtistHref(primary || input.artistName);
}

/**
 * Finger moving down, clearly more vertical than horizontal.
 * A tap (tiny movement) is never a swipe.
 * On a scrolling song page, only a pull-down at the top counts.
 */
export function isDownwardArtistSwipe(input: DownwardSwipeInput): boolean {
  if (!Number.isFinite(input.dx) || !Number.isFinite(input.dy) || !Number.isFinite(input.elapsedMs)) {
    return false;
  }
  if (input.requireScrollTop && (input.scrollTop ?? 0) > SCROLL_TOP_SLOP_PX) return false;
  if (input.elapsedMs < 0 || input.elapsedMs > SWIPE_MAX_MS) return false;
  if (input.dy < SWIPE_MIN_PX) return false;
  if (input.dy <= Math.abs(input.dx) * SWIPE_VERTICAL_RATIO) return false;
  return true;
}
