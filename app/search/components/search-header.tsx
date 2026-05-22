"use client";

import Link from "next/link";

type SearchHeaderProps = {
  query: string;
  onQueryChange: (value: string) => void;
  queryDisplay: string;
  countsLabel: string;
};

export function SearchHeader({
  query,
  onQueryChange,
  queryDisplay,
  countsLabel,
}: SearchHeaderProps) {
  return (
    <header className="search-shell-header">
      <div className="search-shell-header__top">
        <div className="search-shell-header__brand">
          <p className="search-shell-header__logo">Retroverse</p>
          <p className="search-shell-header__tagline">Press play for the past.</p>
        </div>

        <div className="search-shell-header__search-wrap">
          <span className="search-shell-header__search-icon" aria-hidden="true">
            ⌕
          </span>
          <input
            type="search"
            className="search-shell-header__field"
            placeholder="Search artist, album, or song..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            autoComplete="off"
            autoFocus
            spellCheck={false}
            aria-label="Search artist, album, or song"
            enterKeyHint="search"
          />
          {query ? (
            <button
              type="button"
              className="search-shell-header__clear"
              onClick={() => onQueryChange("")}
              aria-label="Clear search"
            >
              ×
            </button>
          ) : null}
        </div>

        <Link className="search-shell-header__home" href="/">
          ← Back home
        </Link>
      </div>

      <div className="search-shell-header__ship" aria-hidden="true">
        <svg viewBox="0 0 120 64" className="search-shell-header__ship-svg">
          <ellipse cx="60" cy="48" rx="38" ry="10" fill="#e85d1a" opacity="0.35" />
          <path
            d="M28 42 Q60 8 92 42 L88 50 Q60 28 32 50 Z"
            fill="#f5f2ea"
            stroke="#12343a"
            strokeWidth="2"
          />
          <ellipse cx="60" cy="36" rx="22" ry="14" fill="#b8dcff" stroke="#12343a" strokeWidth="2" />
          <circle cx="52" cy="36" r="4" fill="#12343a" />
          <circle cx="68" cy="36" r="4" fill="#12343a" />
        </svg>
      </div>

      <div className="search-shell-header__results">
        <p className="search-shell-header__results-kicker">Search results for</p>
        <h1 className="search-shell-header__query">{queryDisplay}</h1>
        <p className="search-shell-header__counts" role="status" aria-live="polite">
          {countsLabel}
        </p>
      </div>
    </header>
  );
}
