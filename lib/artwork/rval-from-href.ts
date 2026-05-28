const RE_RVAL = /^RVAL\d{6}$/i;

/** Extract RVAL from `/album/RVAL######` (or welcome-style `/albums/...`). */
export function rvalFromPublicHref(href?: string | null): string | null {
  const raw = href?.trim();
  if (!raw) return null;
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  const match = path.match(/\/albums?\/([^/?#]+)/i);
  if (!match?.[1]) return null;
  const seg = decodeURIComponent(match[1]).trim().toUpperCase();
  return RE_RVAL.test(seg) ? seg : null;
}
