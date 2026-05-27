import { notFound } from "next/navigation";

import { loadArtistPage } from "@/lib/artist/load-artist-page";

import { ArtistSectionPlaceholder } from "../section-placeholder";

type Props = { params: Promise<{ slug: string }> };

export default async function ArtistYearsPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadArtistPage(slug);
  if (!data) notFound();

  if (!data.hasDominantYearData || data.dominantYears.length === 0) {
    return (
      <ArtistSectionPlaceholder
        slug={data.slug}
        displayName={data.displayName}
        title="Dominant Years"
      />
    );
  }

  const maxYearCount = Math.max(...data.dominantYears.map((y) => y.count), 1);

  return (
    <section className="artist-years artist-years--full" aria-labelledby="dominant-years-full">
      <div className="artist-section-head artist-section-head--aqua">
        <h2 id="dominant-years-full">Dominant Years</h2>
      </div>
      <p className="artist-years__intro">
        Hot 100 chart-week density by year for {data.displayName}.
      </p>
      <div className="artist-years__chart">
        {data.dominantYears.map((bar) => (
          <div key={bar.year} className="artist-years__bar-wrap">
            <div
              className="artist-years__bar"
              style={{ height: `${Math.round((bar.count / maxYearCount) * 100)}%` }}
            />
            <span className="artist-years__label">{bar.year}</span>
            <span className="artist-years__count">{bar.count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
