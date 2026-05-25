"use client";

import { useState } from "react";

import { highlightMatchText } from "@/lib/search/highlight-match";
import { OVERLAY_VISIBLE_INITIAL } from "@/lib/search/search-breadth";
import type {
  SearchSuggestionGroups,
  SearchSuggestionItem,
} from "@/lib/search/search-suggestion-types";

type HomeSearchSuggestionsProps = {
  groups: SearchSuggestionGroups;
  loading?: boolean;
  rvYearIntent?: boolean;
  onSelect: (item: SearchSuggestionItem) => void;
  className?: string;
  overlayMode?: boolean;
  pending?: boolean;
  highlightQuery?: string;
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

function SuggestionRow({
  item,
  highlightQuery,
}: {
  item: SearchSuggestionItem;
  highlightQuery?: string;
}) {
  const isYear = item.kind === "year";
  const actionLabel = item.actionLabel?.trim();
  const title = highlightQuery?.trim()
    ? highlightMatchText(item.title, highlightQuery)
    : item.title;

  return (
    <>
      <SuggestionThumb item={item} />
      <span className="home-search-suggestions__copy">
        <span className="home-search-suggestions__title">{title}</span>
        {item.artist ? (
          <span className="home-search-suggestions__artist">
            {highlightQuery?.trim()
              ? highlightMatchText(item.artist, highlightQuery)
              : item.artist}
          </span>
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

function SectionList({
  sectionKey,
  heading,
  items,
  onSelect,
  highlightQuery,
}: {
  sectionKey: keyof SearchSuggestionGroups;
  heading: string;
  items: SearchSuggestionItem[];
  onSelect: (item: SearchSuggestionItem) => void;
  highlightQuery?: string;
}) {
  const initial = OVERLAY_VISIBLE_INITIAL[sectionKey];
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, initial);
  const hidden = items.length - visible.length;

  return (
    <div className="home-search-suggestions__section">
      <p className="home-search-suggestions__heading">
        {heading}
        <span className="home-search-suggestions__count"> ({items.length})</span>
      </p>
      <ul className="home-search-suggestions__list">
        {visible.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`home-search-suggestions__item${item.actionLabel ? " home-search-suggestions__item--cta" : ""}`}
              role="option"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(item)}
            >
              <SuggestionRow item={item} highlightQuery={highlightQuery} />
            </button>
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <button
          type="button"
          className="home-search-suggestions__more"
          onClick={() => setExpanded(true)}
        >
          Show {hidden} more
        </button>
      ) : null}
    </div>
  );
}

export function HomeSearchSuggestions({
  groups,
  loading = false,
  rvYearIntent = false,
  onSelect,
  className = "",
  overlayMode = false,
  pending = false,
  highlightQuery = "",
}: HomeSearchSuggestionsProps) {
  const hasAny = SECTIONS.some(({ key }) => groups[key].length > 0);
  const rootClass = [
    "home-search-suggestions",
    rvYearIntent ? "home-search-suggestions--year-intent" : "",
    pending ? "home-search-suggestions--pending" : "",
    overlayMode ? "home-search-suggestions--overlay" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const showPosterStatus = !overlayMode;
  const showPosterEmpty = showPosterStatus && !loading && !hasAny;
  const highlight = overlayMode ? highlightQuery : undefined;

  return (
    <div
      id="home-search-suggestions"
      className={rootClass}
      role="listbox"
      aria-label="Search suggestions"
      aria-busy={loading || pending}
    >
      {showPosterStatus && loading ? (
        <p className="home-search-suggestions__status" role="status">
          {hasAny ? "Updating…" : "Searching the stacks…"}
        </p>
      ) : null}

      {showPosterEmpty ? (
        <p className="home-search-suggestions__status" role="status">
          No matches yet — try another spelling.
        </p>
      ) : null}

      {SECTIONS.map(({ key, label, yearIntentLabel }) => {
        const items = groups[key];
        if (items.length === 0) return null;
        const heading = rvYearIntent && key === "years" ? yearIntentLabel : label;

        if (overlayMode) {
          return (
            <SectionList
              key={key}
              sectionKey={key}
              heading={heading}
              items={items}
              onSelect={onSelect}
              highlightQuery={highlight}
            />
          );
        }

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
