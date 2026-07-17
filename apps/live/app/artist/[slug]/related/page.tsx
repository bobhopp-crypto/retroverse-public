import Link from "next/link";
import { notFound } from "next/navigation";

import { loadArtistPage } from "@/lib/artist/load-artist-page";
import { loadRelatedArtistsFromGraph } from "@/lib/artist/load-related-artists";
import { resolveCanonicalArtist } from "@/lib/public/canonical-public-resolver";

import { ArtistCover } from "../artist-cover";
import { ArtistSectionPlaceholder } from "../section-placeholder";

type Props = { params: Promise<{ slug: string }> };

export default async function ArtistRelatedPage({ params }: Props) {
  const { slug } = await params;
  const canonical = await resolveCanonicalArtist(slug);
  if (!canonical) notFound();
  const data = await loadArtistPage(canonical.routeToken);

  let related = data.relatedArtists;
  if (related.length < 8 && data.artistId > 0) {
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
        title="Related artists"
      />
    );
  }

  return (
    <section className="artist-related artist-related--full" aria-labelledby="related-artists-full">
      <div className="artist-section-head artist-section-head--dark">
        <h2 id="related-artists-full">Related artists</h2>
      </div>
      <ul className="artist-related__list">
        {related.map((rel) => (
          <li key={rel.slug}>
            <Link href={`/artist/${rel.slug}`} prefetch className="artist-related__card">
              <ArtistCover
                src={rel.coverUrl}
                alt=""
                className="artist-related__avatar"
                fallbackClassName="artist-related__avatar-fallback"
                fallbackVariant="vinyl"
                placeholderContext={{ artist: rel.name, album: rel.name }}
              />
              <span className="artist-related__name">{rel.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
