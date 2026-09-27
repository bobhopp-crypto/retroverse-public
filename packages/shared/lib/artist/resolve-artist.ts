import { cache } from "react";

import { displayArtistName } from "@/lib/artist/slug";
import { inspectQuery } from "@/lib/inspect/pg";
import {
  canonicalArtistHref,
  resolveCanonicalArtist,
} from "@/lib/public/canonical-public-resolver";
import { normalizeArtistMatchKey } from "@/lib/search/canonicalize-search";

export type ResolvedArtistIdentity = {
  artistId: number;
  rvar: string;
  canonicalName: string;
  displayName: string;
  /** Canonical RVAR route token; retained as `slug` for view compatibility. */
  slug: string;
};

/** Public artist paths are canonical numeric artist IDs. Names never mint routes. */
export function artistPagePath(rvar: string): string | null {
  const raw = String(rvar).trim().toUpperCase();
  if (!/^RVAR\d{6}$/.test(raw)) return null;
  return canonicalArtistHref(raw);
}

async function resolveArtistRouteIdentityImpl(routeToken: string): Promise<ResolvedArtistIdentity | null> {
  const resolved = await resolveCanonicalArtist(routeToken);
  if (!resolved) return null;
  return {
    artistId: resolved.artistId,
    rvar: resolved.rvar,
    canonicalName: resolved.canonicalName,
    displayName: resolved.displayName,
    slug: resolved.routeToken,
  };
}

/** Compatibility export: the input is a canonical RVAR route token, never a name slug or database ID. */
export const resolveArtistFromSlug = cache(resolveArtistRouteIdentityImpl);

const CREDIT_LINE = /\s(?:feat\.?|ft\.?|featuring)\s/i;

async function resolveUnambiguousArtistName(name: string): Promise<ResolvedArtistIdentity | null> {
  const key = normalizeArtistMatchKey(name);
  if (!key) return null;
  const rows = await inspectQuery<{ id: string | number; rvar: string; canonical_name: string }>(
    `
    SELECT id, rvar, canonical_name
    FROM artists
    WHERE lower(regexp_replace(trim(canonical_name), '^the\\s+', '', 'i')) = $1
    ORDER BY id
    LIMIT 2
    `,
    [key],
  );
  // Two rows (Rihanna person forks, Jackson 5 vs a second Jackson row) are not a choice.
  if (rows.length !== 1) return null;
  const rvar = rows[0]!.rvar?.trim().toUpperCase() ?? "";
  const confirmed = await resolveCanonicalArtist(rvar);
  if (!confirmed) return null;
  return {
    artistId: confirmed.artistId,
    rvar: confirmed.rvar,
    canonicalName: confirmed.canonicalName,
    displayName: displayArtistName(confirmed.canonicalName),
    slug: confirmed.routeToken,
  };
}

/**
 * Exact display name → live RVAR, confirmed by resolveCanonicalArtist.
 * Feat/ft credit lines are not looked up. Zero or multiple rows return null.
 */
export async function resolveLiveArtistName(name: string): Promise<ResolvedArtistIdentity | null> {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean || CREDIT_LINE.test(clean)) return null;
  try {
    return await resolveUnambiguousArtistName(clean);
  } catch {
    return null;
  }
}

/** Search-only exact candidate resolution. It never chooses a fuzzy or first result. */
export async function resolveArtistForSearchQuery(
  query: string,
  artistHints: string[] = [],
): Promise<ResolvedArtistIdentity | null> {
  const candidates = [query, ...artistHints].map((value) => value.trim()).filter(Boolean);
  for (const candidate of candidates) {
    const resolved = await resolveUnambiguousArtistName(candidate);
    if (resolved) return resolved;
  }
  return null;
}
