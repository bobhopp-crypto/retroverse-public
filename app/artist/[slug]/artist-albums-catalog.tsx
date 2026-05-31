import type { ArtistAlbumCard } from "@/lib/artist/types";
import { albumSuggestionHref } from "@/lib/search/entity-routes";

import { ArtistAlbumTile } from "./artist-album-tile";

import "./artist-albums-catalog.css";

type Props = {
  artistName: string;
  albums: ArtistAlbumCard[];
};

export function ArtistAlbumsCatalog({ artistName, albums }: Props) {
  return (
    <section className="artist-albums-catalog" aria-labelledby="artist-albums-catalog">
      <header className="artist-albums-catalog__head">
        <p className="artist-albums-catalog__eyebrow">Discography</p>
        <h2 id="artist-albums-catalog" className="artist-albums-catalog__title">
          Albums
        </h2>
        <p className="artist-albums-catalog__count">
          {albums.length === 0
            ? "No albums on file"
            : `${albums.length} album${albums.length === 1 ? "" : "s"} · release order`}
        </p>
      </header>

      {albums.length > 0 ? (
        <div className="artist-albums-catalog__grid">
          {albums.map((album) => {
            const href = albumSuggestionHref(
              album.title,
              album.rval ? `/albums/${album.rval}` : null,
            );
            if (!href) return null;
            return (
              <ArtistAlbumTile
                key={album.pgAlbumId}
                pgAlbumId={album.pgAlbumId}
                title={album.title}
                releaseYear={album.releaseYear}
                rval={album.rval}
                coverUrl={album.coverUrl}
                artistName={artistName}
                href={href}
              />
            );
          })}
        </div>
      ) : (
        <p className="artist-albums-catalog__empty" role="status">
          No albums indexed yet — check back as the archive grows.
        </p>
      )}
    </section>
  );
}
