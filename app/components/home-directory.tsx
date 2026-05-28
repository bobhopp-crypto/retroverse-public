"use client";

import Link from "next/link";
import { useCallback, useState, type MouseEvent } from "react";

import type { HomeSearchScope } from "@/lib/search/home-search-scope";

import { HomeSearchInput } from "./home-search-input";

/** Scoped overlay only — never route to removed `/browse/*` mini-sites. */
const SEARCH_PADS: {
  label: string;
  hint: string;
  tone: "teal" | "brass" | "orange";
  scope: HomeSearchScope;
}[] = [
  { label: "Artists", hint: "Search artists", tone: "teal", scope: "artists" },
  { label: "Albums", hint: "Search albums", tone: "brass", scope: "albums" },
  { label: "Tracks", hint: "Search songs", tone: "orange", scope: "songs" },
];

const CHARTS_PAD_HREF = "/rv/1978";

type Props = {
  opsEnabled: boolean;
};

export function HomeDirectory({ opsEnabled }: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchScope, setSearchScope] = useState<HomeSearchScope>("all");

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
        <p className="home-directory__kicker">Archive directory</p>
        <h1 className="home-directory__title">Retroverse</h1>
        <p className="home-directory__tagline">Press Play for the Past</p>
      </header>

      <section className="home-directory__search" aria-label="Search the archive">
        <p className="home-directory__search-label">Primary terminal</p>
        <HomeSearchInput
          open={searchOpen}
          onOpenChange={handleSearchOpenChange}
          scope={searchScope}
        />
      </section>

      <nav className="home-directory__pads" aria-label="Search the archive">
        <p className="home-directory__pads-label">Directory pads</p>
        <div className="home-directory__pads-grid">
          {SEARCH_PADS.map((pad) => (
            <button
              key={pad.scope}
              type="button"
              className={`home-directory__pad home-directory__pad--${pad.tone}`}
              aria-haspopup="dialog"
              onClick={onSearchPadClick(pad.scope)}
            >
              <span className="home-directory__pad-label">{pad.label}</span>
              <span className="home-directory__pad-hint">{pad.hint}</span>
            </button>
          ))}
          <Link
            href={CHARTS_PAD_HREF}
            prefetch
            className="home-directory__pad home-directory__pad--rust"
          >
            <span className="home-directory__pad-label">Charts</span>
            <span className="home-directory__pad-hint">RV chronology</span>
          </Link>
        </div>
      </nav>

      <footer className="home-directory__footer">
        <p className="home-directory__footer-line">
          Living archival directory · tap a pad or search the stacks
        </p>
        <p className="home-directory__footer-links">
          <a
            href="mailto:feedback@retroverse.live?subject=Retroverse%20Feedback"
            className="home-directory__feedback"
          >
            Send feedback
          </a>
        </p>
      </footer>

      {opsEnabled ? (
        <Link href="/ops" prefetch className="home-directory__ops-utility" aria-label="Archive operations">
          Archive Ops
        </Link>
      ) : null}
    </div>
  );
}
