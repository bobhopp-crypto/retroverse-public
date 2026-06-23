import Link from "next/link";
import type { ReactNode } from "react";

import "./rv2-public-shell.css";

export type Rv2PublicShellProps = {
  children: ReactNode;
  /** Appended to `rv2-live` on `<main>` (e.g. `rv2-song`). */
  className?: string;
  /** Years nav destination. */
  yearsHref?: string;
  /** Renders inside `<main>` before chrome (e.g. live channel follower). */
  lead?: ReactNode;
  /** Controlled search field — used on `/search` (preserves live ?q= sync). */
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
  onSearchCommit?: () => void;
};

export function Rv2PublicShell({
  children,
  className,
  yearsHref = "/rv/1974",
  lead,
  searchQuery,
  onSearchQueryChange,
  onSearchCommit,
}: Rv2PublicShellProps) {
  const controlledSearch = onSearchQueryChange != null;
  const mainClassName = className ? `rv2-live ${className}` : "rv2-live";

  return (
    <main className={mainClassName}>
      {lead}
      <div className="rv2-live__grid-glow" aria-hidden />
      <header className="rv2-live__topbar">
        <Link href="/" className="rv2-live__brand" aria-label="Retroverse home">
          Retroverse
        </Link>
        <nav className="rv2-live__nav" aria-label="Retroverse sections">
          <Link href="/retroverse-2/live">Live</Link>
          <Link href="/search">Search</Link>
          <Link href={yearsHref}>Years</Link>
        </nav>
      </header>

      <section className="rv2-live__search-panel" aria-label="Global search">
        <p className="rv2-live__eyebrow">Global Search</p>
        {controlledSearch ? (
          <div className="rv2-live__search">
            <input
              name="q"
              type="search"
              placeholder="Search music..."
              value={searchQuery ?? ""}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                onSearchCommit?.();
              }}
              autoComplete="off"
              autoFocus
              spellCheck={false}
              aria-label="Search artist, album, or song"
              enterKeyHint="search"
            />
            {searchQuery ? (
              <button
                type="button"
                className="rv2-live__search-clear"
                onClick={() => onSearchQueryChange("")}
                aria-label="Clear search"
              >
                ×
              </button>
            ) : (
              <button type="button" onClick={() => onSearchCommit?.()}>
                Search
              </button>
            )}
          </div>
        ) : (
          <form className="rv2-live__search" action="/search">
            <input name="q" type="search" placeholder="Search music..." />
            <button type="submit">Search</button>
          </form>
        )}
      </section>

      <div className="rv2-public-shell__body">{children}</div>
    </main>
  );
}
