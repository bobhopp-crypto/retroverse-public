"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { HOME_SEARCH_ZONE, posterRectPctStyle } from "@/lib/home/poster-layout";
import { fetchSearchSuggestions } from "@/lib/search/fetch-suggestions";
import {
  EMPTY_SUGGESTION_GROUPS,
  type SearchSuggestionItem,
} from "@/lib/search/search-suggestion-types";

import { HomeSearchSuggestions } from "./home-search-suggestions";

const DEBOUNCE_MS = 180;

/** Poster search — suggestions on homepage; route only on pick or Enter. */
export function HomeSearchInput() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState(EMPTY_SUGGESTION_GROUPS);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const trimmed = query.trim();
  const showSuggestions = suggestOpen && trimmed.length >= 2;

  const routeToSearch = useCallback(
    (raw: string) => {
      const v = raw.trim();
      if (v.length < 2) return;
      setSuggestOpen(false);
      router.push(`/search?q=${encodeURIComponent(v)}`);
    },
    [router],
  );

  const routeFromSuggestion = useCallback(
    (item: SearchSuggestionItem) => {
      routeToSearch(item.routeQuery);
      setQuery(item.routeQuery);
    },
    [routeToSearch],
  );

  const focusInput = () => {
    inputRef.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (trimmed.length < 2) {
      requestIdRef.current += 1;
      setSuggestions(EMPTY_SUGGESTION_GROUPS);
      setSuggestLoading(false);
      setSuggestOpen(false);
      return;
    }

    setSuggestOpen(true);
    const requestId = ++requestIdRef.current;
    setSuggestLoading(true);

    const timer = window.setTimeout(() => {
      fetchSearchSuggestions(trimmed)
        .then((result) => {
          if (requestId !== requestIdRef.current) return;
          if (result.ok) setSuggestions(result.suggestions);
          setSuggestLoading(false);
        })
        .catch(() => {
          if (requestId !== requestIdRef.current) return;
          setSuggestLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      requestIdRef.current += 1;
    };
  }, [trimmed]);

  return (
    <div
      className="home-search-wrap"
      style={posterRectPctStyle(HOME_SEARCH_ZONE)}
    >
      <div className="home-search-zone" role="search">
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          className="home-search-input"
          aria-label="Search Retroverse"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls="home-search-suggestions"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          value={query}
          onPointerDown={(e) => {
            e.stopPropagation();
            focusInput();
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            focusInput();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length >= 2) setSuggestOpen(true);
          }}
          onFocus={() => {
            if (trimmed.length >= 2) setSuggestOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setSuggestOpen(false), 150);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              routeToSearch(e.currentTarget.value);
            }
            if (e.key === "Escape") {
              setSuggestOpen(false);
            }
          }}
        />
        <button
          type="button"
          className="home-search-zone__icon"
          aria-label="Search"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            const v = inputRef.current?.value ?? "";
            if (v.trim().length >= 2) {
              routeToSearch(v);
            } else {
              focusInput();
            }
          }}
        />
      </div>

      {showSuggestions ? (
        <div id="home-search-suggestions">
          <HomeSearchSuggestions
            groups={suggestions}
            loading={suggestLoading}
            onSelect={routeFromSuggestion}
          />
        </div>
      ) : null}
    </div>
  );
}
