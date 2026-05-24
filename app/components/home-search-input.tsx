"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { HOME_SEARCH_ZONE, posterRectPctStyle } from "@/lib/home/poster-layout";
import { fetchSearchSuggestions } from "@/lib/search/fetch-suggestions";
import {
  EMPTY_SUGGESTION_GROUPS,
  type SearchSuggestionItem,
} from "@/lib/search/search-suggestion-types";
import {
  isRvYearOnlyQuery,
  resolveInstantRvYearRoute,
  resolveRvYearOnlyQuery,
} from "@/lib/rv-year/rv-year-intent";
import { yearSuggestionHref } from "@/lib/search/entity-routes";

import { HomeSearchSuggestions } from "./home-search-suggestions";

const DEBOUNCE_MS = 150;

/** Poster search — entity discovery; pure years route instantly to RV Year. */
export function HomeSearchInput() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState(EMPTY_SUGGESTION_GROUPS);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [rvYearIntent, setRvYearIntent] = useState(false);

  const trimmed = query.trim();
  const isYearPowerRoute = isRvYearOnlyQuery(trimmed);
  const showSuggestions = suggestOpen && trimmed.length >= 2 && !isYearPowerRoute;

  const routeInstantYear = useCallback(
    (raw: string) => {
      const year = resolveInstantRvYearRoute(raw);
      if (year == null) return false;
      requestIdRef.current += 1;
      setSuggestOpen(false);
      setSuggestLoading(false);
      setSuggestions(EMPTY_SUGGESTION_GROUPS);
      setRvYearIntent(false);
      router.push(yearSuggestionHref(year));
      return true;
    },
    [router],
  );

  const routeToSearch = useCallback(
    (raw: string) => {
      const v = raw.trim();
      if (v.length < 2) return;
      if (routeInstantYear(v)) return;
      setSuggestOpen(false);
      const rvYear = resolveRvYearOnlyQuery(v);
      if (rvYear != null) {
        router.push(yearSuggestionHref(rvYear));
        return;
      }
      router.push(`/search?q=${encodeURIComponent(v)}`);
    },
    [router, routeInstantYear],
  );

  const routeFromSuggestion = useCallback(
    (item: SearchSuggestionItem) => {
      const href = item.href?.trim();
      if (!href || href.startsWith("/search")) return;
      setSuggestOpen(false);
      setQuery(item.routeQuery);
      router.push(href);
    },
    [router],
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
      setRvYearIntent(false);
      return;
    }

    if (isRvYearOnlyQuery(trimmed)) {
      return;
    }

    setSuggestOpen(true);
    const requestId = ++requestIdRef.current;
    setSuggestLoading(true);

    const timer = window.setTimeout(() => {
      fetchSearchSuggestions(trimmed)
        .then((result) => {
          if (requestId !== requestIdRef.current) return;
          if (result.ok) {
            setSuggestions(result.suggestions);
            setRvYearIntent(result.rvYearIntent === true);
          }
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
      <div
        className={`home-search-stack${showSuggestions ? " home-search-stack--open" : ""}`}
      >
        <div
          className={`home-search-zone${query.length > 0 ? " home-search-zone--filled" : ""}`}
          role="search"
        >
          <div className="home-search-zone__field">
            {query.length === 0 ? (
              <span className="home-search-zone__hint" aria-hidden>
                Search the stacks…
              </span>
            ) : null}
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
              placeholder=""
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
                const next = e.target.value;
                setQuery(next);
                if (routeInstantYear(next)) return;
                const nextTrim = next.trim();
                if (nextTrim.length >= 2 && !isRvYearOnlyQuery(nextTrim)) {
                  setSuggestOpen(true);
                }
              }}
              onFocus={() => {
                if (trimmed.length >= 2 && !isYearPowerRoute) setSuggestOpen(true);
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
        </div>

        {showSuggestions ? (
          <HomeSearchSuggestions
            groups={suggestions}
            loading={suggestLoading}
            rvYearIntent={rvYearIntent}
            onSelect={routeFromSuggestion}
          />
        ) : null}
      </div>
    </div>
  );
}
