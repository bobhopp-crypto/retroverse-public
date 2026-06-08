import "server-only";

import { coerceArtistPublicHref } from "@/lib/search/entity-routes";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { coverPathToUrl } from "@/lib/artist/cover-url";
import { albumSuggestionHref } from "@/lib/search/entity-routes";
import type { HomeSearchPayload } from "@/lib/search/home-search-types";

function likePattern(query: string): string {
  const q = query.trim().toLowerCase().replace(/[%_]/g, "");
  if (q.length < 2) return "%";
  return `%${q}%`;
}

/** Deterministic Neon prefix/contains index — primary fallback when welcome is down or empty. */
export async function loadPgPrefixSearchPayload(
  query: string,
): Promise<HomeSearchPayload | null> {
  const ping = await inspectPing();
  if (!ping.ok) return null;

  const pattern = likePattern(query);

  const [artistRows, trackRows, albumRows] = await Promise.all([
    inspectQuery<{
      canonical_name: string;
      cover_path: string | null;
    }>(
      `
      SELECT a.canonical_name,
        (
          SELECT al.canonical_cover_path FROM albums al
          WHERE al.artist_id = a.id AND al.canonical_cover_path IS NOT NULL
          ORDER BY al.release_year DESC NULLS LAST LIMIT 1
        ) AS cover_path
      FROM artists a
      WHERE lower(a.canonical_name) LIKE $1
         OR lower(regexp_replace(trim(a.canonical_name), '^the\\s+', '', 'i')) LIKE $1
      ORDER BY a.canonical_name
      LIMIT 12
      `,
      [pattern],
    ),
    inspectQuery<{
      track_id: string;
      canonical_title: string;
      canonical_artist_name: string;
    }>(
      `
      SELECT track_id, canonical_title, canonical_artist_name
      FROM canonical_track_display
      WHERE lower(canonical_title) LIKE $1
         OR lower(canonical_artist_name) LIKE $1
      ORDER BY first_chart_date ASC NULLS LAST, canonical_title ASC
      LIMIT 14
      `,
      [pattern],
    ),
    inspectQuery<{
      title: string;
      artist_name: string;
      release_year: number | null;
      rval: string | null;
      cover_path: string | null;
    }>(
      `
      SELECT al.title,
        ar.canonical_name AS artist_name,
        al.release_year,
        aek.external_key AS rval,
        al.canonical_cover_path AS cover_path
      FROM albums al
      JOIN artists ar ON ar.id = al.artist_id
      LEFT JOIN album_external_keys aek ON aek.album_id = al.id
      WHERE lower(al.title) LIKE $1
         OR lower(ar.canonical_name) LIKE $1
      ORDER BY al.release_year ASC NULLS LAST, al.title ASC
      LIMIT 10
      `,
      [pattern],
    ),
  ]);

  if (
    artistRows.length === 0 &&
    trackRows.length === 0 &&
    albumRows.length === 0
  ) {
    return null;
  }

  return {
    ok: true,
    q: query,
    artists: artistRows.map((row) => ({
      kind: "artist" as const,
      name: row.canonical_name,
      href: coerceArtistPublicHref(row.canonical_name, null) ?? "",
      coverUrl: coverPathToUrl(row.cover_path),
    })),
    tracks: trackRows.map((row) => ({
      kind: "track" as const,
      title: row.canonical_title,
      artist: row.canonical_artist_name,
      href: `/track/${row.track_id}`,
      subtitle: null,
      year: null,
      coverUrl: null,
    })),
    albums: albumRows
      .map((row) => {
        const href = albumSuggestionHref(
          row.title,
          row.rval ? `/albums/${row.rval}` : null,
        );
        if (!href) return null;
        return {
          kind: "album" as const,
          title: row.title,
          artist: row.artist_name,
          year: row.release_year,
          href,
          coverUrl: coverPathToUrl(row.cover_path),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null),
    charts: [],
    incomplete: true,
  };
}

export function mergeHomeSearchPayloads(
  primary: HomeSearchPayload,
  fallback: HomeSearchPayload,
): HomeSearchPayload {
  const artistKeys = new Set(
    primary.artists.map((a) => a.name.trim().toLowerCase()),
  );
  const trackKeys = new Set(
    primary.tracks.map((t) => `${t.artist}::${t.title}`.toLowerCase()),
  );
  const albumKeys = new Set(
    primary.albums.map((a) => `${a.artist}::${a.title}`.toLowerCase()),
  );

  const artists = [...primary.artists];
  for (const row of fallback.artists) {
    const key = row.name.trim().toLowerCase();
    if (artistKeys.has(key)) continue;
    artistKeys.add(key);
    artists.push(row);
  }

  const tracks = [...primary.tracks];
  for (const row of fallback.tracks) {
    const key = `${row.artist}::${row.title}`.toLowerCase();
    if (trackKeys.has(key)) continue;
    trackKeys.add(key);
    tracks.push(row);
  }

  const albums = [...primary.albums];
  for (const row of fallback.albums) {
    const key = `${row.artist}::${row.title}`.toLowerCase();
    if (albumKeys.has(key)) continue;
    albumKeys.add(key);
    albums.push(row);
  }

  return {
    ...primary,
    artists,
    tracks,
    albums,
    incomplete: primary.incomplete || fallback.incomplete,
  };
}
