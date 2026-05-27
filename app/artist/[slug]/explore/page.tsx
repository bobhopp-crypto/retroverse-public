import { notFound } from "next/navigation";

import { loadArtistPage } from "@/lib/artist/load-artist-page";

import { ArtistSectionPlaceholder } from "../section-placeholder";

type Props = { params: Promise<{ slug: string }> };

export default async function ArtistExplorePage({ params }: Props) {
  const { slug } = await params;
  const data = await loadArtistPage(slug);
  if (!data) notFound();

  if (data.exploreLinks.length === 0) {
    return (
      <ArtistSectionPlaceholder
        slug={data.slug}
        displayName={data.displayName}
        title="Explore Deeper"
      />
    );
  }

  return (
    <section className="artist-explore artist-explore--full" aria-labelledby="explore-deeper-full">
      <div className="artist-section-head artist-section-head--dark">
        <h2 id="explore-deeper-full">Explore Deeper</h2>
      </div>
      <div className="artist-explore__pills">
        {data.exploreLinks.map((link, index) => (
          <a
            key={`${link.href}-${link.label}-${index}`}
            href={link.href}
            className="artist-explore__pill"
          >
            {link.label}
          </a>
        ))}
      </div>
    </section>
  );
}
