"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchSearchSuggestions } from "@/lib/search/fetch-suggestions";
import {
  EMPTY_SUGGESTION_GROUPS,
  type SearchSuggestionItem,
} from "@/lib/search/search-suggestion-types";
import { suggestionGroupsHaveResults } from "@/lib/search/pick-first-suggestion";

import { HomeSearchSuggestions } from "@/app/components/home-search-suggestions";

const DEBOUNCE_MS = 150;
const RVTR_RE = /^RVTR\d{6}$/i;

type Props = {
  onSelectRvtr: (rvtr: string) => void;
  disabled?: boolean;
};

function rvtrFromSuggestion(item: SearchSuggestionItem): string | null {
  if (item.rvId && RVTR_RE.test(item.rvId)) return item.rvId.toUpperCase();
  const hrefMatch = item.href.match(/\/(?:track|retroverse-2\/song)\/(RVTR\d{6})/i);
  if (hrefMatch?.[1]) return hrefMatch[1].toUpperCase();
  return null;
}

export function HomepageSearchBar({ onSelectRvtr, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState(EMPTY_SUGGESTION_GROUPS);
  const [loading, setLoading] = useState(false);

  const trimmed = query.trim();
  const showDropdown = focused && trimmed.length >= 2;
  const hasResults = suggestionGroupsHaveResults(suggestions);

  useEffect(() => {
    if (trimmed.length < 2) {
      setSuggestions(EMPTY_SUGGESTION_GROUPS);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    const timer = window.setTimeout(() => {
      const controller = new AbortController();
      setLoading(true);
      fetchSearchSuggestions(trimmed, controller.signal)
        .then((response) => {
          if (requestId !== requestIdRef.current) return;
          setSuggestions(response.suggestions);
        })
        .catch(() => {
          if (requestId !== requestIdRef.current) return;
          setSuggestions(EMPTY_SUGGESTION_GROUPS);
        })
        .finally(() => {
          if (requestId !== requestIdRef.current) return;
          setLoading(false);
        });

      return () => controller.abort();
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [trimmed]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const handleSelect = useCallback(
    (item: SearchSuggestionItem) => {
      const rvtr = rvtrFromSuggestion(item);
      if (rvtr) {
        onSelectRvtr(rvtr);
        setQuery("");
        setFocused(false);
        inputRef.current?.blur();
        return;
      }
      if (item.kind === "song") return;
    },
    [onSelectRvtr],
  );

  const placeholder = useMemo(
    () => (disabled ? "Live broadcast — search paused" : "Search Retroverse…"),
    [disabled],
  );

  return (
    <div className="home-v1__search-wrap" ref={rootRef}>
      <label className="home-v1__search-label" htmlFor="home-v1-search">
        Search
      </label>
      <input
        ref={inputRef}
        id="home-v1-search"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="home-v1__search-input"
        placeholder={placeholder}
        value={query}
        disabled={disabled}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setFocused(true)}
      />

      {showDropdown ? (
        <div className="home-v1__search-dropdown" role="listbox" aria-label="Search suggestions">
          {loading && !hasResults ? (
            <p className="home-v1__search-status">Searching…</p>
          ) : null}
          {!loading && !hasResults ? (
            <p className="home-v1__search-status">No matches — try another title or artist.</p>
          ) : null}
          {hasResults ? (
            <HomeSearchSuggestions
              groups={suggestions}
              loading={loading}
              onSelect={handleSelect}
              highlightQuery={trimmed}
              className="home-v1__search-suggestions"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
