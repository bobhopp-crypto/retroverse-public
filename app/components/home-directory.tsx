"use client";

import Link from "next/link";

import { HomeSearchInput } from "./home-search-input";

const ACCESS_PADS = [
  { label: "Artists", href: "/browse/artists", hint: "Artist exhibits", tone: "teal" },
  { label: "Albums", href: "/browse/albums", hint: "Album exhibits", tone: "brass" },
  { label: "Tracks", href: "/browse/tracks", hint: "Song exhibits", tone: "orange" },
  { label: "Charts", href: "/charts", hint: "Chart history", tone: "rust" },
] as const;

type Props = {
  opsEnabled: boolean;
};

export function HomeDirectory({ opsEnabled }: Props) {
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
        <HomeSearchInput />
      </section>

      <nav className="home-directory__pads" aria-label="Browse the archive">
        <p className="home-directory__pads-label">Directory pads</p>
        <div className="home-directory__pads-grid">
          {ACCESS_PADS.map((pad) => (
            <Link
              key={pad.href}
              href={pad.href}
              prefetch
              className={`home-directory__pad home-directory__pad--${pad.tone}`}
            >
              <span className="home-directory__pad-label">{pad.label}</span>
              <span className="home-directory__pad-hint">{pad.hint}</span>
            </Link>
          ))}
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
