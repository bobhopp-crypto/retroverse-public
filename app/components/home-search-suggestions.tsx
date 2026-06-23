"use client";

import Link from "next/link";
import { useState } from "react";

import { ArtistCover } from "@/app/artist/[slug]/artist-cover";
import { rvalFromPublicHref } from "@/lib/artwork/rval-from-href";
import { highlightMatchText } from "@/lib/search/highlight-match";
import { resolveSuggestionHref } from "@/lib/search/resolve-suggestion-href";
import { suggestionKindLabel } from "@/lib/search/suggestion-display";
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
  /** Close overlay after Link navigation (overlay mode). */
  onDismiss?: () => void;
  /** Spotlight overlay — explicit discovery escape hatch. */
  query?: string;
  onViewAll?: () => void;
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
  if (item.kind === "year") {
    return (
      <span className="home-search-suggestions__thumb home-search-suggestions__thumb--year" aria-hidden>
        {item.year != null ? String(item.year).slice(-2) : item.title.slice(-2)}
      </span>
    );
  }

  if (item.kind === "album") {
    return (
      <span className="home-search-suggestions__thumb home-search-suggestions__thumb--album" aria-hidden>
        <ArtistCover
          src={item.coverUrl}
          alt=""
          className="home-search-suggestions__thumb-img"
          fallbackClassName="home-search-suggestions__thumb home-search-suggestions__thumb--plate"
          fallbackVariant="plate"
          plateDensity="dense"
          placeholderContext={{
            artist: item.artist ?? item.title,
            album: item.title,
            releaseYear: item.year,
            rval:
              rvalFromPublicHref(item.href) ??
              item.rvId?.match(/^RVAL\d{6}$/i)?.[0] ??
              undefined,
          }}
        />
      </span>
    );
  }

  if (item.kind === "artist") {
    return (
      <span className="home-search-suggestions__thumb home-search-suggestions__thumb--artist" aria-hidden>
        <ArtistCover
          src={item.coverUrl}
          alt=""
          className="home-search-suggestions__thumb-img"
          fallbackClassName="home-search-suggestions__thumb home-search-suggestions__thumb--plate"
          fallbackVariant="vinyl"
          plateDensity="dense"
          placeholderContext={{ artist: item.title, album: item.artist ?? "Artist" }}
        />
      </span>
    );
  }

  return (
    <span className="home-search-suggestions__thumb home-search-suggestions__thumb--song" aria-hidden>
      <ArtistCover
        src={item.coverUrl}
        alt=""
        className="home-search-suggestions__thumb-img"
        fallbackClassName="home-search-suggestions__thumb home-search-suggestions__thumb--plate"
        fallbackVariant="plate"
        plateDensity="dense"
        placeholderContext={{
          artist: item.artist ?? "",
          album: item.title,
          releaseYear: item.year,
        }}
      />
    </span>
  );
}

function SuggestionRow({
  item,
  highlightQuery,
  overlayMode = false,
}: {
  item: SearchSuggestionItem;
  highlightQuery?: string;
  overlayMode?: boolean;
}) {
  const isYear = item.kind === "year";
  const actionLabel = item.actionLabel?.trim();
  const title = highlightQuery?.trim()
    ? highlightMatchText(item.title, highlightQuery)
    : item.title;
  const kindLabel = overlayMode ? suggestionKindLabel(item) : "";

  return (
    <>
      {!overlayMode ? <SuggestionThumb item={item} /> : null}
      <span className="home-search-suggestions__copy">
        <span className="home-search-suggestions__title">{title}</span>
        {overlayMode && kindLabel ? (
          <span className="home-search-suggestions__kind">{kindLabel}</span>
        ) : item.artist && item.kind !== "artist" ? (
          <span className="home-search-suggestions__artist">
            {highlightQuery?.trim()
              ? highlightMatchText(item.artist, highlightQuery)
              : item.artist}
          </span>
        ) : isYear ? (
          <span className="home-search-suggestions__artist">RV History</span>
        ) : null}
      </span>
      {!overlayMode && actionLabel ? (
        <span className="home-search-suggestions__cta">{actionLabel}</span>
      ) : !overlayMode && item.year != null && item.year > 0 && item.kind !== "year" ? (
        <span className="home-search-suggestions__year">{item.year}</span>
      ) : overlayMode && actionLabel ? (
        <span className="home-search-suggestions__cta">{actionLabel}</span>
      ) : null}
    </>
  );
}

function suggestionItemClassName(
  item: SearchSuggestionItem,
  sectionKey: keyof SearchSuggestionGroups,
  index: number,
): string {
  return [
    "home-search-suggestions__item",
    item.actionLabel ? "home-search-suggestions__item--cta" : "",
    sectionKey === "artists" && index === 0 ? "home-search-suggestions__item--hero" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function SectionList({
  sectionKey,
  heading,
  items,
  onSelect,
  onDismiss,
  highlightQuery,
}: {
  sectionKey: keyof SearchSuggestionGroups;
  heading: string;
  items: SearchSuggestionItem[];
  onSelect: (item: SearchSuggestionItem) => void;
  onDismiss?: () => void;
  highlightQuery?: string;
}) {
  const initial = OVERLAY_VISIBLE_INITIAL[sectionKey];
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, initial);
  const hidden = items.length - visible.length;

  return (
    <div className="home-search-suggestions__section home-search-suggestions__section--overlay">
      <p className="home-search-suggestions__heading">
        {heading}
      </p>
      <ul className="home-search-suggestions__list">
        {visible.map((item, index) => {
          const href = resolveSuggestionHref(item);
          const className = suggestionItemClassName(item, sectionKey, index);

          if (href) {
            return (
              <li key={item.id}>
                <Link
                  href={href}
                  prefetch
                  className={className}
                  role="option"
                  onClick={() => onDismiss?.()}
                >
                  <SuggestionRow item={item} highlightQuery={highlightQuery} overlayMode />
                </Link>
              </li>
            );
          }

          return (
            <li key={item.id}>
              <button
                type="button"
                className={className}
                role="option"
                onClick={() => onSelect(item)}
              >
                <SuggestionRow item={item} highlightQuery={highlightQuery} overlayMode />
              </button>
            </li>
          );
        })}
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

function ViewAllResults({
  query,
  onViewAll,
}: {
  query: string;
  onViewAll: () => void;
}) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return null;

  return (
    <div className="home-search-suggestions__view-all-wrap">
      <button type="button" className="home-search-suggestions__view-all" onClick={onViewAll}>
        View All Results
      </button>
    </div>
  );
}

export function HomeSearchSuggestions({
  groups,
  loading = false,
  rvYearIntent = false,
  onSelect,
  onDismiss,
  query = "",
  onViewAll,
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
              onDismiss={onDismiss}
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

      {overlayMode && onViewAll ? <ViewAllResults query={query} onViewAll={onViewAll} /> : null}
    </div>
  );
}
