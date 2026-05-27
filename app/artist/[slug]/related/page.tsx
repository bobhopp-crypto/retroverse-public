import Link from "next/link";
import { notFound } from "next/navigation";

import { loadArtistPage } from "@/lib/artist/load-artist-page";
import { loadRelatedArtistsFromGraph } from "@/lib/artist/load-related-artists";

import { ArtistCover } from "../artist-cover";
import { ArtistSectionPlaceholder } from "../section-placeholder";

type Props = { params: Promise<{ slug: string }> };

export default async function ArtistRelatedPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadArtistPage(slug);
  if (!data) notFound();

  let related = data.relatedArtists;
  if (related.length < 8) {
    const graph = await loadRelatedArtistsFromGraph(data.artistId, data.slug, 12);
    const seen = new Set(related.map((r) => r.slug));
    for (const row of graph) {
      if (seen.has(row.slug)) continue;
      seen.add(row.slug);
      related.push(row);
    }
  }

  if (related.length === 0) {
    return (
      <ArtistSectionPlaceholder
        slug={data.slug}
        displayName={data.displayName}
        title="Related Artists"
      />
    );
  }

  return (
    <section className="artist-related artist-related--full" aria-labelledby="related-artists-full">
      <div className="artist-section-head artist-section-head--dark">
        <h2 id="related-artists-full">Related Artists</h2>
      </div>
      <ul className="artist-related__list">
        {related.map((rel) => (
          <li key={rel.slug}>
            <Link href={`/artist/${rel.slug}`} prefetch className="artist-related__card">
              {rel.coverUrl ? (
                <ArtistCover
                  src={rel.coverUrl}
                  alt=""
                  className="artist-related__avatar"
                  fallbackClassName="artist-related__avatar-fallback"
                />
              ) : (
                <span className="artist-related__avatar-fallback" aria-hidden />
              )}
              <span className="artist-related__name">{rel.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
