import { notFound } from "next/navigation";

import { loadArtistPage } from "@/lib/artist/load-artist-page";
import { resolveCanonicalArtist } from "@/lib/public/canonical-public-resolver";

import { ArtistSectionPlaceholder } from "../section-placeholder";

type Props = { params: Promise<{ slug: string }> };

export default async function ArtistExplorePage({ params }: Props) {
  const { slug } = await params;
  const canonical = await resolveCanonicalArtist(slug);
  if (!canonical) notFound();
  const data = await loadArtistPage(canonical.routeToken);

  if (data.exploreLinks.length === 0) {
    return (
      <ArtistSectionPlaceholder
        slug={data.slug}
        displayName={data.displayName}
        title="Further in the archive"
      />
    );
  }

  return (
    <section className="artist-explore artist-explore--full" aria-labelledby="explore-deeper-full">
      <div className="artist-section-head artist-section-head--dark">
        <h2 id="explore-deeper-full">Further in the archive</h2>
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
