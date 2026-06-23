/** Canonical public entity hrefs — RVTR/RVAL only; no slug or search fallbacks. */

import { trackPageHref } from "@/lib/search/entity-routes";

export const RE_RVTR = /^RVTR\d{6}$/i;
export const RE_RVAL = /^RVAL\d{6}$/i;

export function normalizeRvtrToken(token: string | null | undefined): string | null {
  const raw = token?.trim() ?? "";
  if (!raw || !RE_RVTR.test(raw)) return null;
  return raw.toUpperCase();
}

export function normalizeRvalToken(token: string | null | undefined): string | null {
  const raw = token?.trim() ?? "";
  if (!raw || !RE_RVAL.test(raw)) return null;
  return raw.toUpperCase();
}

export function trackHrefFromToken(token: string | null | undefined): string | null {
  const rvtr = normalizeRvtrToken(token);
  return rvtr ? trackPageHref(rvtr) : null;
}

export function albumHrefFromToken(token: string | null | undefined): string | null {
  const rval = normalizeRvalToken(token);
  return rval ? `/album/${rval}` : null;
}

export function chartEntryPublicHref(
  trackId: string | null | undefined,
  isAlbum: boolean,
): string | null {
  return isAlbum ? albumHrefFromToken(trackId) : trackHrefFromToken(trackId);
}
