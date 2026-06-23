"use client";

import type { SearchCountPart } from "@/lib/search/types";

type SearchHeaderProps = {
  queryDisplay: string;
  countsLabel: string;
  countParts: SearchCountPart[];
  loading?: boolean;
};

export function SearchHeader({
  queryDisplay,
  countsLabel,
  countParts,
  loading = false,
}: SearchHeaderProps) {
  return (
    <header className="search-hero">
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
      </div>
    </header>
  );
}
