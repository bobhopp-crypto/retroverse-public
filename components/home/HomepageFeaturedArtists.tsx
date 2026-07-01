import Link from "next/link";

import type { HomeFeaturedArtist } from "@/lib/home/homepage-types";

type Props = {
  artists: HomeFeaturedArtist[];
};

export function HomepageFeaturedArtists({ artists }: Props) {
  return (
    <section className="home-row home-row--artists" aria-label="Featured artists">
      <div className="home-row__head">
        <h2 className="home-row__title">Featured Artists</h2>
      </div>
      <div className="home-artist-grid">
        {artists.map((artist) => (
          <Link key={artist.slug} href={artist.href} className="home-artist-card">
            <div className="home-artist-card__cover" aria-hidden>
              {artist.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={artist.coverUrl} alt="" className="home-artist-card__cover-img" />
              ) : (
                <div className="home-artist-card__cover-fallback">
                  {artist.name.slice(0, 1)}
                </div>
              )}
            </div>
            <p className="home-artist-card__name">{artist.name}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
