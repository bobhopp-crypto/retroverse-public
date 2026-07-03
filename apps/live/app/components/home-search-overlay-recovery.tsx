"use client";

import { ARTIST_SLUGS } from "@/lib/artist/slug";
import { yearSuggestionHref } from "@/lib/search/entity-routes";
import { rvYearHref, RV_CHRONOLOGY_DEFAULT_YEAR } from "@/lib/rv/rv-chronology-paths";

const FEATURED_YEARS = [1973, 1978, 1984, 1999] as const;

type Props = {
  mode: "idle" | "empty";
  query?: string;
  onNavigate: (href: string) => void;
};

export function HomeSearchOverlayRecovery({ mode, query, onNavigate }: Props) {
  const lead =
    mode === "idle"
      ? "Search artists, albums, songs, or an RV year."
      : `No matches for “${query ?? ""}” — try a featured path:`;

  return (
    <div className="home-search-overlay-recovery">
      <p className="home-search-overlay-recovery__lead">{lead}</p>

      <section className="home-search-overlay-recovery__block">
        <h3 className="home-search-overlay-recovery__heading">RV Years</h3>
        <div className="home-search-overlay-recovery__pills">
          {FEATURED_YEARS.map((year) => (
            <button
              key={year}
              type="button"
              className="home-search-overlay-recovery__pill"
              onClick={() => onNavigate(yearSuggestionHref(year))}
            >
              Explore {year}
            </button>
          ))}
        </div>
      </section>

      <section className="home-search-overlay-recovery__block">
        <h3 className="home-search-overlay-recovery__heading">Featured Artists</h3>
        <div className="home-search-overlay-recovery__pills">
          {Object.entries(ARTIST_SLUGS).map(([slug, name]) => (
            <button
              key={slug}
              type="button"
              className="home-search-overlay-recovery__pill"
              onClick={() => onNavigate(`/artist/${slug}`)}
            >
              {name}
            </button>
          ))}
        </div>
      </section>

      <section className="home-search-overlay-recovery__block">
        <h3 className="home-search-overlay-recovery__heading">Chart Stacks</h3>
        <button
          type="button"
          className="home-search-overlay-recovery__pill home-search-overlay-recovery__pill--wide"
          onClick={() => onNavigate(rvYearHref(RV_CHRONOLOGY_DEFAULT_YEAR))}
        >
          Open chart history
        </button>
      </section>
    </div>
  );
}
