"use client";

import Link from "next/link";

import { HomeSearchInput } from "./home-search-input";

const ACCESS_PADS = [
  { label: "Artists", href: "/browse/artists", hint: "Artist exhibits" },
  { label: "Albums", href: "/browse/albums", hint: "Album exhibits" },
  { label: "Tracks", href: "/browse/tracks", hint: "Song exhibits" },
  { label: "Charts", href: "/charts", hint: "Chart history" },
] as const;

type Props = {
  opsEnabled: boolean;
};

export function HomeDirectory({ opsEnabled }: Props) {
  return (
    <div className="home-directory__board">
      <header className="home-directory__header">
        <p className="home-directory__kicker">Archive directory</p>
        <h1 className="home-directory__title">Retroverse</h1>
        <p className="home-directory__tagline">Search the music archive</p>
      </header>

      <section className="home-directory__search" aria-label="Search the archive">
        <HomeSearchInput />
      </section>

      <nav className="home-directory__pads" aria-label="Browse the archive">
        {ACCESS_PADS.map((pad) => (
          <Link key={pad.href} href={pad.href} prefetch className="home-directory__pad">
            <span className="home-directory__pad-label">{pad.label}</span>
            <span className="home-directory__pad-hint">{pad.hint}</span>
          </Link>
        ))}
      </nav>

      {opsEnabled ? (
        <p className="home-directory__ops">
          <Link href="/ops" prefetch className="home-directory__ops-link">
            Ops console
          </Link>
        </p>
      ) : null}
    </div>
  );
}
