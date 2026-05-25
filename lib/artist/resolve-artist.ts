import { cache } from "react";

import { inspectQuery } from "@/lib/inspect/pg";
import {
  artistMatchKeys,
  normalizeArtistMatchKey,
} from "@/lib/search/canonicalize-search";
import {
  ARTIST_SLUGS,
  displayArtistName,
  slugFromArtistName,
} from "@/lib/artist/slug";

const CANONICAL_ARTIST_WHERE = `
  lower(regexp_replace(trim(canonical_name), '^the\\s+', '', 'i'))
  = lower(regexp_replace(trim($1), '^the\\s+', '', 'i'))
`;

async function resolveArtistId(
  name: string,
): Promise<{ id: number; canonicalName: string } | null> {
  const keys = artistMatchKeys(name);
  for (const key of keys) {
    const exact = await inspectQuery<{ id: number; canonical_name: string }>(
      `SELECT id, canonical_name FROM artists WHERE lower(trim(canonical_name)) = lower(trim($1)) LIMIT 1`,
      [key],
    );
    if (exact[0]) return { id: exact[0].id, canonicalName: exact[0].canonical_name };
  }

  const matchKey = normalizeArtistMatchKey(name);
  if (matchKey) {
    const byKey = await inspectQuery<{ id: number; canonical_name: string }>(
      `SELECT id, canonical_name FROM artists WHERE ${CANONICAL_ARTIST_WHERE} LIMIT 1`,
      [matchKey],
    );
    if (byKey[0]) return { id: byKey[0].id, canonicalName: byKey[0].canonical_name };
  }

  const fuzzyNeedle = (matchKey || name).replace(/[%_]/g, " ");
  const fuzzy = await inspectQuery<{ id: number; canonical_name: string }>(
    `
    SELECT id, canonical_name FROM artists
    WHERE lower(regexp_replace(trim(canonical_name), '^the\\s+', '', 'i'))
      LIKE '%' || $1 || '%'
    ORDER BY length(canonical_name), canonical_name
    LIMIT 1
    `,
    [fuzzyNeedle],
  );
  return fuzzy[0] ? { id: fuzzy[0].id, canonicalName: fuzzy[0].canonical_name } : null;
}

/** Public artist exhibit route — slug matches search + `/artist/[slug]`. */
export function artistPagePath(name: string): string {
  return `/artist/${slugFromArtistName(name)}`;
}

async function resolveArtistFromSlugImpl(slug: string): Promise<{
  artistId: number;
  canonicalName: string;
  displayName: string;
  slug: string;
} | null> {
  const key = slug.trim().toLowerCase();
  if (!key) return null;

  const knownName = ARTIST_SLUGS[key];
  if (knownName) {
    const r = await resolveArtistId(knownName);
    if (r) {
      return {
        artistId: r.id,
        canonicalName: r.canonicalName,
        displayName: displayArtistName(r.canonicalName),
        slug: key,
      };
    }
  }

  const bySlug = await inspectQuery<{ id: number; canonical_name: string }>(
    `
    SELECT id, canonical_name FROM artists
    WHERE lower(regexp_replace(trim(canonical_name), '[^a-z0-9]+', '-', 'g')) = lower($1)
       OR lower(regexp_replace(
            regexp_replace(trim(canonical_name), '^the\\s+', '', 'i'),
            '[^a-z0-9]+', '-', 'g'
          )) = lower($1)
    LIMIT 1
    `,
    [key],
  );
  if (bySlug[0]) {
    return {
      artistId: bySlug[0].id,
      canonicalName: bySlug[0].canonical_name,
      displayName: displayArtistName(bySlug[0].canonical_name),
      slug: slugFromArtistName(bySlug[0].canonical_name),
    };
  }

  const guess = key.replace(/-/g, " ");
  const byGuess = await resolveArtistId(guess);
  if (byGuess) {
    return {
      artistId: byGuess.id,
      canonicalName: byGuess.canonicalName,
      displayName: displayArtistName(byGuess.canonicalName),
      slug: slugFromArtistName(byGuess.canonicalName),
    };
  }

  return null;
}

export const resolveArtistFromSlug = cache(resolveArtistFromSlugImpl);

/** Resolve artist for search chart history — query + panel artist/song hints. */
export async function resolveArtistForSearchQuery(
  query: string,
  artistHints: string[] = [],
): Promise<{
  artistId: number;
  canonicalName: string;
  displayName: string;
  slug: string;
} | null> {
  const q = query.trim();
  if (q.length < 2) return null;

  const slugCandidates = new Set<string>();
  for (const key of artistMatchKeys(q)) {
    slugCandidates.add(slugFromArtistName(key));
  }
  for (const name of artistHints) {
    if (!name?.trim()) continue;
    for (const key of artistMatchKeys(name)) {
      slugCandidates.add(slugFromArtistName(key));
    }
  }

  for (const slug of slugCandidates) {
    if (!slug) continue;
    const bySlug = await resolveArtistFromSlug(slug);
    if (bySlug) return bySlug;
  }

  const nameCandidates = new Set<string>();
  for (const key of artistMatchKeys(q)) nameCandidates.add(key);
  for (const name of artistHints) {
    if (!name?.trim()) continue;
    for (const key of artistMatchKeys(name)) nameCandidates.add(key);
  }
  nameCandidates.add(q);

  for (const name of nameCandidates) {
    const row = await resolveArtistId(name);
    if (!row) continue;
    return {
      artistId: row.id,
      canonicalName: row.canonicalName,
      displayName: displayArtistName(row.canonicalName),
      slug: slugFromArtistName(row.canonicalName),
    };
  }

  return null;
}
