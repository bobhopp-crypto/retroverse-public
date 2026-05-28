import Link from "next/link";

import { loadArtistPage } from "@/lib/artist/load-artist-page";
import { albumSuggestionHref } from "@/lib/search/entity-routes";

import { ArtistCover } from "../artist-cover";
import { ArtistSectionPlaceholder } from "../section-placeholder";

type Props = { params: Promise<{ slug: string }> };

export default async function ArtistLibraryPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadArtistPage(slug);

  const albums = data.essentialAlbums;
  if (data.libraryTracks <= 0 || albums.length === 0) {
    return (
      <ArtistSectionPlaceholder
        slug={data.slug}
        displayName={data.displayName}
        title="Collected recordings"
      />
    );
  }

  return (
    <section className="artist-library artist-library--full" aria-labelledby="in-library-full">
      <div className="artist-section-head artist-section-head--light">
        <h2 id="in-library-full">Collected recordings</h2>
      </div>
      <div className="artist-library__grid artist-library__grid--full">
        {albums.map((a) => {
          const href = albumSuggestionHref(
            a.title,
            a.rval ? `/albums/${a.rval}` : null,
          );
          const thumb = (
            <ArtistCover
              src={a.coverUrl}
              alt={a.title}
              className="artist-library__thumb"
              fallbackClassName="artist-library__thumb artist-album-tile__fallback"
              fallbackVariant="plate"
              plateDensity="compact"
              placeholderContext={{
                rval: a.rval,
                artist: data.displayName,
                album: a.title,
                releaseYear: a.releaseYear,
              }}
            />
          );
          if (!href) {
            return <div key={a.pgAlbumId}>{thumb}</div>;
          }
          return (
            <Link
              key={a.pgAlbumId}
              href={href}
              prefetch
              className="artist-library__thumb-link"
              aria-label={`${a.title} album`}
            >
              {thumb}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
