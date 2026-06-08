"use client";

import Link from "next/link";
import { useCallback, useState, type MouseEvent } from "react";

import {
  HOME_FEATURED_YEARS,
  type YearCoverStrip,
} from "@/lib/home/home-featured-years";
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
};

export function HomeDirectory({ opsEnabled, yearCovers = [] }: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchScope, setSearchScope] = useState<HomeSearchScope>("all");

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

  return (
    <div className="home-directory__board">
      <div className="home-directory__mount" aria-hidden />
      <header className="home-directory__header">
        <p className="home-directory__kicker">Music time machine</p>
        <h1 className="home-directory__title">Retroverse</h1>
        <p className="home-directory__tagline">
          Choose a year. Explore a music time machine.
        </p>
      </header>

      <section className="home-directory__search" aria-label="Search Retroverse">
        <p className="home-directory__search-label">Search</p>
        <HomeSearchInput
          open={searchOpen}
          onOpenChange={handleSearchOpenChange}
          scope={searchScope}
        />
      </section>

      <section className="home-directory__years" aria-label="Featured years">
        <p className="home-directory__years-label">Start with a year</p>
        <div className="home-directory__years-stack">
          {HOME_FEATURED_YEARS.map((entry) => {
            const covers = (coverMap.get(entry.year) ?? []).slice(0, YEAR_COVER_DISPLAY);
            return (
              <Link
                key={entry.year}
                href={entry.href}
                prefetch
                className={`home-directory__year home-directory__year--${entry.year}`}
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

      <nav className="home-directory__archive" aria-label="Explore the archive">
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

      <footer className="home-directory__footer">
        <p className="home-directory__footer-line">
          Living music archive · pick a year or search the stacks
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
