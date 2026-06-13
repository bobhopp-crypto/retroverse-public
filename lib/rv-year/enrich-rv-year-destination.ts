import { resolveArtistFromSlug, artistPagePath } from "@/lib/artist/resolve-artist";
import { fillHeroCoverGrid } from "@/lib/rv-year/hero-cover-fill";
import {
  buildRvYearDestination,
  type RvYearDestination,
  type RvYearDestinationDraft,
} from "@/lib/rv-year/rv-year-destination";

export async function enrichRvYearDestination(
  destination: RvYearDestinationDraft,
): Promise<RvYearDestination> {
  const fill = await fillHeroCoverGrid(destination.heroCoverCandidates);

  const definingArtists = await Promise.all(
    destination.definingArtists.map(async (artist) => {
      const resolved = await resolveArtistFromSlug(artist.slug);
      if (resolved) {
        return {
          ...artist,
          name: resolved.displayName,
          slug: resolved.slug,
          href: `/artist/${resolved.slug}`,
        };
      }
      const fallback = artistPagePath(artist.name);
      if (!fallback) return { ...artist, href: null };
      const fallbackResolved = await resolveArtistFromSlug(fallback.slice("/artist/".length));
      return fallbackResolved
        ? {
            ...artist,
            name: fallbackResolved.displayName,
            slug: fallbackResolved.slug,
            href: `/artist/${fallbackResolved.slug}`,
          }
        : { ...artist, href: null };
    }),
  );

  return {
    essentialAlbums: destination.essentialAlbums,
    heroCovers: fill.covers,
    definingArtists,
    definingSongs: destination.definingSongs,
  };
}

export { buildRvYearDestination };
