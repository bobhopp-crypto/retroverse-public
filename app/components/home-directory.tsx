"use client";

import Link from "next/link";
import { useCallback, useState, type MouseEvent } from "react";

import type { HomeFeaturedYear, YearCoverStrip } from "@/lib/home/home-featured-years";
import type { HomepageHero } from "@/lib/ops/event-control/types";
import type { HomeSearchScope } from "@/lib/search/home-search-scope";

import { OpsEntryLink } from "@/components/OpsEntryLink";

import { HomeSearchInput } from "./home-search-input";

/** Display count on year cards — pipeline may verify more; we show the first four. */
const YEAR_COVER_DISPLAY = 4;

const ARCHIVE_CARDS: {
  label: string;
  subtitle: string;
  tone: "teal" | "gold" | "orange" | "red";
  scope?: HomeSearchScope;
  href?: string;
}[] = [
  { label: "Artists", subtitle: "People behind the music", tone: "teal", scope: "artists" },
  { label: "Albums", subtitle: "Complete records", tone: "gold", scope: "albums" },
  { label: "Tracks", subtitle: "Individual songs", tone: "orange", scope: "songs" },
  { label: "Charts", subtitle: "Music history", tone: "red", href: "/rv/1978" },
];

type Props = {
  opsEnabled: boolean;
  yearCovers?: YearCoverStrip[];
  featuredYears: HomeFeaturedYear[];
  hero?: HomepageHero | null;
  yearsLabel?: string;
};

export function HomeDirectory({
  opsEnabled,
  yearCovers = [],
  featuredYears,
  hero = null,
  yearsLabel = "Start with a year",
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchScope, setSearchScope] = useState<HomeSearchScope>("all");
  const publication = hero != null;

  const coverMap = new Map(yearCovers.map((strip) => [strip.year, strip.coverUrls]));

  const openScopedSearch = useCallback((scope: HomeSearchScope) => {
    setSearchScope(scope);
    setSearchOpen(true);
  }, []);

  const onSearchPadClick = useCallback(
    (scope: HomeSearchScope) => (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      openScopedSearch(scope);
    },
    [openScopedSearch],
  );

  const handleSearchOpenChange = useCallback((open: boolean) => {
    setSearchOpen(open);
    if (!open) setSearchScope("all");
  }, []);

  const yearsSection = (
    <section
      className={`home-directory__years${publication ? " home-directory__years--secondary" : ""}`}
      aria-label="Featured years"
    >
      <p className="home-directory__years-label">{yearsLabel}</p>
      <div className="home-directory__years-stack">
        {featuredYears.map((entry) => {
          const covers = (coverMap.get(entry.year) ?? []).slice(0, YEAR_COVER_DISPLAY);
          return (
            <Link
              key={entry.year}
              href={entry.href}
              prefetch
              className={`home-directory__year home-directory__year--${entry.year}${publication ? " home-directory__year--support" : ""}`}
              aria-label={`Explore ${entry.year}: ${entry.descriptor}`}
            >
              <div className="home-directory__year-head">
                <span className="home-directory__year-number">{entry.year}</span>
                <span className="home-directory__year-desc">{entry.descriptor}</span>
              </div>

              {covers.length > 0 ? (
                <div className="home-directory__year-covers" aria-hidden>
                  {covers.map((url) => (
                    <img
                      key={url}
                      className="home-directory__year-cover-thumb"
                      src={url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  ))}
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );

  const searchSection = (
    <section
      className={`home-directory__search${publication ? " home-directory__search--tertiary" : ""}`}
      aria-label="Search Retroverse"
    >
      <p className="home-directory__search-label">
        {publication ? "Search the archive" : "Search"}
      </p>
      <HomeSearchInput
        open={searchOpen}
        onOpenChange={handleSearchOpenChange}
        scope={searchScope}
      />
    </section>
  );

  const archiveSection = (
    <nav
      className={`home-directory__archive${publication ? " home-directory__archive--tertiary" : ""}`}
      aria-label="Explore the archive"
    >
      <p className="home-directory__archive-label">Explore the archive</p>
      <div className="home-directory__archive-grid">
        {ARCHIVE_CARDS.map((card) =>
          card.href ? (
            <Link
              key={card.label}
              href={card.href}
              prefetch
              className={`home-directory__archive-card home-directory__archive-card--${card.tone}`}
            >
              <span className="home-directory__archive-card-title">{card.label}</span>
              <span className="home-directory__archive-card-sub">{card.subtitle}</span>
            </Link>
          ) : (
            <button
              key={card.scope}
              type="button"
              className={`home-directory__archive-card home-directory__archive-card--${card.tone}`}
              aria-haspopup="dialog"
              onClick={onSearchPadClick(card.scope!)}
            >
              <span className="home-directory__archive-card-title">{card.label}</span>
              <span className="home-directory__archive-card-sub">{card.subtitle}</span>
            </button>
          ),
        )}
      </div>
    </nav>
  );

  return (
    <div className={`home-directory__board${publication ? " home-directory__board--publication" : ""}`}>
      <div className="home-directory__mount" aria-hidden />
      <header
        className={`home-directory__header${publication ? " home-directory__header--compact" : ""}`}
      >
        <p className="home-directory__kicker">
          {publication ? hero.masthead : "Music Time Machine"}
        </p>
        <h1 className="home-directory__title">Retroverse</h1>
        {!publication ? (
          <p className="home-directory__tagline">
            Choose a year. Explore a music time machine.
          </p>
        ) : null}
      </header>

      {hero ? (
        <section className="home-directory__hero" aria-label={hero.featureLabel}>
          <p className="home-directory__hero-masthead">{hero.featureLabel}</p>
          <article className={`home-directory__hero-card ${hero.issueColorClass}`}>
            {hero.featureImageUrl ? (
              <div className="home-directory__hero-media">
                <img
                  className="home-directory__hero-image"
                  src={hero.featureImageUrl}
                  alt=""
                  loading="eager"
                  decoding="async"
                />
              </div>
            ) : null}
            <div className="home-directory__hero-body">
              {hero.eyebrow ? (
                <p className="home-directory__hero-eyebrow">{hero.eyebrow}</p>
              ) : null}
              <h2 className="home-directory__hero-headline">{hero.headline}</h2>
              {hero.subheadline ? (
                <p className="home-directory__hero-subheadline">{hero.subheadline}</p>
              ) : null}
              {hero.description ? (
                <p className="home-directory__hero-description">{hero.description}</p>
              ) : null}
              {hero.venue || hero.date ? (
                <div className="home-directory__hero-meta">
                  {hero.venue ? (
                    <p className="home-directory__hero-venue">{hero.venue}</p>
                  ) : null}
                  {hero.date ? <p className="home-directory__hero-date">{hero.date}</p> : null}
                </div>
              ) : null}
              {hero.featuredArtist ? (
                <p className="home-directory__hero-artist">
                  {hero.featuredArtistSlug ? (
                    <Link href={`/artist/${hero.featuredArtistSlug}`} prefetch>
                      {hero.featuredArtist}
                    </Link>
                  ) : (
                    hero.featuredArtist
                  )}
                </p>
              ) : null}
              {hero.ctaLabel && hero.ctaLink ? (
                <Link href={hero.ctaLink} prefetch className="home-directory__hero-cta">
                  {hero.ctaLabel}
                </Link>
              ) : null}
              {hero.tagline ? (
                <p className="home-directory__hero-tagline">{hero.tagline}</p>
              ) : (
                <p className="home-directory__hero-brand">Music Time Machine</p>
              )}
            </div>
          </article>
        </section>
      ) : null}

      {publication ? (
        <>
          {yearsSection}
          {searchSection}
          {archiveSection}
        </>
      ) : (
        <>
          {searchSection}
          {yearsSection}
          {archiveSection}
        </>
      )}

      <footer className="home-directory__footer">
        <p className="home-directory__footer-line">
          {publication
            ? "From the Living Music Archive"
            : "Living music archive · pick a year or search the stacks"}
        </p>
        <p className="home-directory__footer-links">
          <a
            href="mailto:feedback@retroverse.live?subject=Retroverse%20Feedback"
            className="home-directory__feedback"
          >
            Send feedback
          </a>
          {opsEnabled ? (
            <>
              {" · "}
              <OpsEntryLink className="home-directory__ops-link" next="/ops/sunday-nights" />
            </>
          ) : null}
        </p>
      </footer>

      {opsEnabled ? (
        <Link
          href="/internal/ops-pin?next=/ops"
          prefetch={false}
          className="home-directory__ops-utility"
          aria-label="Archive operations"
        >
          Archive Ops
        </Link>
      ) : null}
    </div>
  );
}
