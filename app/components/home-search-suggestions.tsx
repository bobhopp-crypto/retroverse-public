"use client";

import { useState } from "react";

import type {
  SearchSuggestionGroups,
  SearchSuggestionItem,
} from "@/lib/search/search-suggestion-types";

type HomeSearchSuggestionsProps = {
  groups: SearchSuggestionGroups;
  loading?: boolean;
  rvYearIntent?: boolean;
  onSelect: (item: SearchSuggestionItem) => void;
  /** Extra root class — e.g. overlay terminal list */
  className?: string;
};

const SECTIONS: {
  key: keyof SearchSuggestionGroups;
  label: string;
  yearIntentLabel: string;
}[] = [
  { key: "artists", label: "Artists", yearIntentLabel: "Artists" },
  { key: "albums", label: "Albums", yearIntentLabel: "Albums" },
  { key: "songs", label: "Songs", yearIntentLabel: "Songs" },
  { key: "years", label: "Years", yearIntentLabel: "RV Year" },
];

function SuggestionThumb({ item }: { item: SearchSuggestionItem }) {
  const [broken, setBroken] = useState(false);
  const src = item.coverUrl?.trim();

  if (item.kind === "year") {
    return (
      <span className="home-search-suggestions__thumb home-search-suggestions__thumb--year" aria-hidden>
        {item.year != null ? String(item.year).slice(-2) : item.title.slice(-2)}
      </span>
    );
  }

  if (!src || broken) {
    return (
      <span
        className={`home-search-suggestions__thumb home-search-suggestions__thumb--fallback home-search-suggestions__thumb--${item.kind}`}
        aria-hidden
      >
        {item.title.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <span className="home-search-suggestions__thumb" aria-hidden>
      <img src={src} alt="" onError={() => setBroken(true)} />
    </span>
  );
}

function SuggestionRow({ item }: { item: SearchSuggestionItem }) {
  const isYear = item.kind === "year";
  const actionLabel = item.actionLabel?.trim();

  return (
    <>
      <SuggestionThumb item={item} />
      <span className="home-search-suggestions__copy">
        <span className="home-search-suggestions__title">{item.title}</span>
        {item.artist ? (
          <span className="home-search-suggestions__artist">{item.artist}</span>
        ) : isYear ? (
          <span className="home-search-suggestions__artist">RV History</span>
        ) : null}
      </span>
      {actionLabel ? (
        <span className="home-search-suggestions__cta">{actionLabel}</span>
      ) : item.year != null && item.year > 0 && item.kind !== "year" ? (
        <span className="home-search-suggestions__year">{item.year}</span>
      ) : null}
    </>
  );
}

export function HomeSearchSuggestions({
  groups,
  loading = false,
  rvYearIntent = false,
  onSelect,
  className = "",
}: HomeSearchSuggestionsProps) {
  const hasAny = SECTIONS.some(({ key }) => groups[key].length > 0);
  const rootClass = [
    "home-search-suggestions",
    rvYearIntent ? "home-search-suggestions--year-intent" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      id="home-search-suggestions"
      className={rootClass}
      role="listbox"
      aria-label="Search suggestions"
      aria-busy={loading}
    >
      {loading ? (
        <p className="home-search-suggestions__status" role="status">
          {hasAny ? "Updating…" : "Searching the stacks…"}
        </p>
      ) : null}

      {!loading && !hasAny ? (
        <p className="home-search-suggestions__status" role="status">
          No matches yet — press Enter to search.
        </p>
      ) : null}

      {SECTIONS.map(({ key, label, yearIntentLabel }) => {
        const items = groups[key];
        if (items.length === 0) return null;
        const heading = rvYearIntent && key === "years" ? yearIntentLabel : label;
        return (
          <div key={key} className="home-search-suggestions__section">
            <p className="home-search-suggestions__heading">{heading}</p>
            <ul className="home-search-suggestions__list">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`home-search-suggestions__item${item.actionLabel ? " home-search-suggestions__item--cta" : ""}`}
                    role="option"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onSelect(item)}
                  >
                    <SuggestionRow item={item} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
