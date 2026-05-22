"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cardColorForIndex } from "@/lib/search/card-colors";
import { filterSearchResults } from "@/lib/search/filter-results";
import { MOCK_SEARCH_RESULTS } from "@/lib/search/mock-results";
import type { SearchResult, SearchResultKind } from "@/lib/search/types";

const KIND_LABEL: Record<SearchResultKind, string> = {
  artist: "Artist",
  album: "Album",
  track: "Song",
};

const CARD_TILTS = ["-0.6deg", "0.5deg", "-0.35deg", "0.7deg", "-0.5deg", "0.4deg", "0deg"];

export default function SearchClient() {
  const [query, setQuery] = useState("");

  const results = useMemo(
    () => filterSearchResults(MOCK_SEARCH_RESULTS, query),
    [query],
  );

  return (
    <div className="search-page">
      <div className="search-page__inner">
        <header className="search-top">
          <Link className="search-back" href="/">
            ← Back to poster
          </Link>
          <p className="search-mark">Retroverse</p>
        </header>

        <section className="search-hero" aria-labelledby="search-heading">
          <h1 id="search-heading" className="search-hero__title">
            Search the archive
          </h1>
          <div className="search-field-wrap">
            <input
              type="search"
              className="search-field"
              placeholder="Search artist, album, or song..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              autoFocus
              spellCheck={false}
              aria-label="Search artist, album, or song"
              enterKeyHint="search"
            />
          </div>
          <p className="search-status" role="status" aria-live="polite">
            {results.length} result{results.length === 1 ? "" : "s"}
          </p>
        </section>

        {results.length === 0 ? (
          <p className="search-empty">No matches yet — try another name or year.</p>
        ) : (
          <ul className="search-results">
            {results.map((item, index) => (
              <SearchResultCard key={item.id} item={item} index={index} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SearchResultCard({
  item,
  index,
}: {
  item: SearchResult;
  index: number;
}) {
  const color = cardColorForIndex(index);
  const tilt = CARD_TILTS[index % CARD_TILTS.length];

  return (
    <li>
      <button
        type="button"
        className="search-card"
        style={
          {
            "--card-bg": color.bg,
            "--card-border": color.border,
            "--card-tilt": tilt,
          } as React.CSSProperties
        }
        onClick={() => {
          /* Future: navigate to entity detail route */
        }}
        aria-label={`${KIND_LABEL[item.kind]}: ${item.title} by ${item.artist}, ${item.year}`}
      >
        <div className="search-card__row">
          <div>
            <p className="search-card__title">{item.title}</p>
            {item.kind !== "artist" && (
              <p className="search-card__artist">{item.artist}</p>
            )}
          </div>
          <span className="search-card__kind">{KIND_LABEL[item.kind]}</span>
        </div>
        <div className="search-card__meta">
          <span className="search-card__year">{item.year}</span>
          {item.chartNote ? (
            <span className="search-card__chart">{item.chartNote}</span>
          ) : null}
          {item.hasVdj ? (
            <span className="search-card__vdj" title="In your VirtualDJ library">
              VDJ
            </span>
          ) : null}
        </div>
      </button>
    </li>
  );
}
