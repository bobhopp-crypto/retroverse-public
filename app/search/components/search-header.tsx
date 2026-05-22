"use client";

import Link from "next/link";

type SearchHeaderProps = {
  query: string;
  onQueryChange: (value: string) => void;
  displayTitle: string;
  countsLabel: string;
};

export function SearchHeader({
  query,
  onQueryChange,
  displayTitle,
  countsLabel,
}: SearchHeaderProps) {
  return (
    <header className="search-shell-header">
      <div className="search-shell-header__bar">
        <Link className="search-shell-header__home" href="/">
          ← Home
        </Link>
        <p className="search-shell-header__logo">Retroverse</p>
      </div>

      <div className="search-shell-header__field-wrap">
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
      </div>

      <h1 className="search-shell-header__query">{displayTitle}</h1>
      <p className="search-shell-header__counts" role="status" aria-live="polite">
        {countsLabel}
      </p>
    </header>
  );
}
