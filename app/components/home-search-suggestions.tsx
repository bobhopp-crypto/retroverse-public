"use client";

import type {
  SearchSuggestionGroups,
  SearchSuggestionItem,
} from "@/lib/search/search-suggestion-types";

type HomeSearchSuggestionsProps = {
  groups: SearchSuggestionGroups;
  loading?: boolean;
  onSelect: (item: SearchSuggestionItem) => void;
};

const SECTIONS: {
  key: keyof SearchSuggestionGroups;
  label: string;
}[] = [
  { key: "artists", label: "Artists" },
  { key: "songs", label: "Songs" },
  { key: "albums", label: "Albums" },
  { key: "years", label: "Years" },
];

export function HomeSearchSuggestions({
  groups,
  loading = false,
  onSelect,
}: HomeSearchSuggestionsProps) {
  const hasAny = SECTIONS.some(({ key }) => groups[key].length > 0);

  return (
    <div
      className="home-search-suggestions"
      role="listbox"
      aria-label="Search suggestions"
      aria-busy={loading}
    >
      {loading && !hasAny ? (
        <p className="home-search-suggestions__status" role="status">
          Searching…
        </p>
      ) : null}

      {!loading && !hasAny ? (
        <p className="home-search-suggestions__status" role="status">
          No matches yet — press Enter to search.
        </p>
      ) : null}

      {SECTIONS.map(({ key, label }) => {
        const items = groups[key];
        if (items.length === 0) return null;
        return (
          <div key={key} className="home-search-suggestions__section">
            <p className="home-search-suggestions__heading">{label}</p>
            <ul className="home-search-suggestions__list">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="home-search-suggestions__item"
                    role="option"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onSelect(item)}
                  >
                    {item.label}
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
