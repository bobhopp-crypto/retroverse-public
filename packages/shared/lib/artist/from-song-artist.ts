const CANONICAL_ARTIST_PATH = /^\/artist\/(RVAR\d{6}|\d+)$/i;
const RVAR_RE = /^RVAR\d{6}$/i;
const RVTR_RE = /^RVTR\d{6}$/i;

export type SongArtistLinkage = {
  artistName?: string | null;
  artistHref?: string | null;
  /** Canonical RVAR token stored on the track. Name slugs are ignored. */
  artistSlug?: string | null;
};

export type FromSongArtistInput = {
  rvtr: string;
  track: SongArtistLinkage | null;
  hintedName?: string | null;
};

export type FromSongArtistResolution = {
  canonicalHref: string | null;
  name: string;
  songHref: string | null;
};

/** Canonical `/artist/RVAR…` or legacy numeric artist route. Name slugs are not routes. */
export function canonicalArtistHrefFromLinkage(input: SongArtistLinkage): string | null {
  const raw = input.artistHref?.trim() ?? "";
  const path = raw.split(/[?#]/)[0] ?? "";
  const fromHref = path.match(CANONICAL_ARTIST_PATH);
  if (fromHref?.[1]) return artistPath(fromHref[1]);

  const slug = input.artistSlug?.trim() ?? "";
  if (RVAR_RE.test(slug)) return artistPath(slug);
  return null;
}

function artistPath(token: string): string {
  const normalized = /^\d+$/.test(token) ? token : token.toUpperCase();
  return `/artist/${normalized}`;
}

/**
 * Song → primary artist, using the track's stored artist route only.
 * A display name never mints an RVAR.
 */
export function resolveFromSongArtist(input: FromSongArtistInput): FromSongArtistResolution {
  const hinted = input.hintedName?.trim().replace(/\s+/g, " ") ?? "";
  const rvtr = input.rvtr.trim().toUpperCase();
  const track = input.track;
  const canonicalHref = track ? canonicalArtistHrefFromLinkage(track) : null;
  const name = track?.artistName?.trim() || hinted || "This artist";
  const songHref = track && RVTR_RE.test(rvtr) ? `/retroverse-2/song/${rvtr}` : null;
  return { canonicalHref, name, songHref };
}

/** Archive page when the song has no canonical artist route. */
export function fromSongFallbackCopy(name: string): { title: string; body: string } {
  const label = name.trim() || "This artist";
  return {
    title: "Still connecting",
    body: `${label} is on this song, and the canonical artist page is not linked yet.`,
  };
}
