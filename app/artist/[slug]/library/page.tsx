import { notFound } from "next/navigation";

import { loadArtistPage } from "@/lib/artist/load-artist-page";

import { ArtistCover } from "../artist-cover";
import { ArtistSectionPlaceholder } from "../section-placeholder";

type Props = { params: Promise<{ slug: string }> };

export default async function ArtistLibraryPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadArtistPage(slug);
  if (!data) notFound();

  const covers = data.essentialAlbums.filter((a) => a.coverUrl);
  if (data.libraryTracks <= 0 || covers.length === 0) {
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
        {covers.map((a) => (
          <ArtistCover
            key={a.pgAlbumId}
            src={a.coverUrl}
            alt={a.title}
            className="artist-library__thumb"
            fallbackClassName="artist-library__thumb artist-album-tile__fallback"
          />
        ))}
      </div>
    </section>
  );
}
