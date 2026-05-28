"use client";

import Link from "next/link";

import type { SearchCountPart } from "@/lib/search/types";

type SearchHeaderProps = {
  query: string;
  onQueryChange: (value: string) => void;
  /** Enter — commit trimmed query to ?q= and run search flow. */
  onQueryCommit?: () => void;
  queryDisplay: string;
  countsLabel: string;
  countParts: SearchCountPart[];
  loading?: boolean;
};

function SearchSaucerArt() {
  return (
    <svg
      className="search-hero__saucer-svg"
      viewBox="0 0 200 120"
      aria-hidden="true"
    >
      <ellipse cx="100" cy="88" rx="72" ry="18" fill="#c5e8e8" opacity="0.6" />
      <path
        d="M28 72 Q100 28 172 72 L160 78 Q100 48 40 78 Z"
        fill="#9a9a9a"
        stroke="#12343a"
        strokeWidth="2.5"
      />
      <ellipse cx="100" cy="58" rx="48" ry="22" fill="#7ec8c8" stroke="#12343a" strokeWidth="2.5" />
      <ellipse cx="100" cy="54" rx="38" ry="16" fill="#d4f0f0" opacity="0.85" />
      <circle cx="82" cy="52" r="7" fill="#f5c98a" stroke="#12343a" strokeWidth="1.5" />
      <circle cx="108" cy="50" r="8" fill="#f5c98a" stroke="#12343a" strokeWidth="1.5" />
      <circle cx="118" cy="56" r="5" fill="#d4a574" stroke="#12343a" strokeWidth="1.5" />
      <path
        d="M168 64 L188 48 L192 52 L172 70 Z"
        fill="#e85d1a"
        stroke="#12343a"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function SearchHeader({
  query,
  onQueryChange,
  onQueryCommit,
  queryDisplay,
  countsLabel,
  countParts,
  loading = false,
}: SearchHeaderProps) {
  return (
    <header className="search-hero">
      <div className="search-hero__sky" aria-hidden="true">
        <span className="search-hero__star search-hero__star--1">✦</span>
        <span className="search-hero__star search-hero__star--2">✦</span>
        <span className="search-hero__star search-hero__star--3">·</span>
        <span className="search-hero__star search-hero__star--4">✦</span>
      </div>

      <div className="search-hero__top">
        <div className="search-hero__brand">
          <Link href="/" className="search-hero__logo">
            Retroverse
          </Link>
          <p className="search-hero__tagline">Press play for the past.</p>
        </div>
        <Link className="search-hero__home" href="/">
          ← Back home
        </Link>
      </div>

      <div className="search-hero__search-wrap">
        <span className="search-hero__search-icon" aria-hidden="true">
          ⌕
        </span>
        <input
          type="search"
          className="search-hero__field"
          placeholder="Search artist, album, or song..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            onQueryCommit?.();
          }}
          autoComplete="off"
          autoFocus
          spellCheck={false}
          aria-label="Search artist, album, or song"
          enterKeyHint="search"
        />
        {query ? (
          <button
            type="button"
            className="search-hero__clear"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
          >
            ×
          </button>
        ) : null}
      </div>

      <div className="search-hero__results-block">
        <div className="search-hero__results-copy">
          <p className="search-hero__kicker">Search results for</p>
          <h1 className="search-hero__query">{queryDisplay}</h1>
          {countParts.length > 0 ? (
            <p
              className={`search-hero__counts${loading ? " search-hero__counts--loading" : ""}`}
              role="status"
              aria-live="polite"
            >
              {countParts.map((part, i) => (
                <span key={part.label} className="search-hero__count-item">
                  {i > 0 ? <span className="search-hero__count-sep"> • </span> : null}
                  <span className="search-hero__count-num">{part.value}</span>{" "}
                  <span className="search-hero__count-label">{part.label}</span>
                </span>
              ))}
            </p>
          ) : (
            <p
              className={`search-hero__counts search-hero__counts--solo${loading ? " search-hero__counts--loading" : ""}`}
              role="status"
              aria-live="polite"
            >
              {countsLabel}
            </p>
          )}
        </div>
        <SearchSaucerArt />
      </div>
    </header>
  );
}
