"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

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
import "./home-search-overlay.css";

const DEBOUNCE_MS = 150;

type Props = {
  onClose: () => void;
};

export function HomeSearchOverlay({ onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const [mounted, setMounted] = useState(false);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState(EMPTY_SUGGESTION_GROUPS);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [rvYearIntent, setRvYearIntent] = useState(false);

  const trimmed = query.trim();
  const isYearPowerRoute = isRvYearOnlyQuery(trimmed);
  const showResults = trimmed.length >= 2 && !isYearPowerRoute;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("home-search-overlay-open");
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(focusTimer);
      document.documentElement.classList.remove("home-search-overlay-open");
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const routeInstantYear = useCallback(
    (raw: string) => {
      const year = resolveInstantRvYearRoute(raw);
      if (year == null) return false;
      onClose();
      router.push(yearSuggestionHref(year));
      return true;
    },
    [router, onClose],
  );

  const routeToSearch = useCallback(
    (raw: string) => {
      const v = raw.trim();
      if (v.length < 2) return;
      if (routeInstantYear(v)) return;
      const rvYear = resolveRvYearOnlyQuery(v);
      onClose();
      if (rvYear != null) {
        router.push(yearSuggestionHref(rvYear));
        return;
      }
      router.push(`/search?q=${encodeURIComponent(v)}`);
    },
    [router, onClose, routeInstantYear],
  );

  const routeFromSuggestion = useCallback(
    (item: SearchSuggestionItem) => {
      const href = item.href?.trim();
      if (!href || href.startsWith("/search")) return;
      onClose();
      setQuery(item.routeQuery);
      router.push(href);
    },
    [router, onClose],
  );

  useEffect(() => {
    if (trimmed.length < 2) {
      requestIdRef.current += 1;
      setSuggestions(EMPTY_SUGGESTION_GROUPS);
      setSuggestLoading(false);
      setRvYearIntent(false);
      return;
    }

    if (isRvYearOnlyQuery(trimmed)) {
      setSuggestions(EMPTY_SUGGESTION_GROUPS);
      setSuggestLoading(false);
      setRvYearIntent(false);
      return;
    }

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

  if (!mounted) return null;

  return createPortal(
    <div className="home-search-overlay" role="presentation">
      <button
        type="button"
        className="home-search-overlay__backdrop"
        aria-label="Close search"
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        className="home-search-overlay__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Search Retroverse"
      >
        <header className="home-search-overlay__chrome">
          <div className="home-search-overlay__top">
            <p className="home-search-overlay__kicker">Archive terminal</p>
            <button
              type="button"
              className="home-search-overlay__close"
              onClick={onClose}
            >
              Close
            </button>
          </div>
          <form
            className="home-search-overlay__field-wrap"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              routeToSearch(query);
            }}
          >
            <input
              ref={inputRef}
              type="search"
              inputMode="search"
              className="home-search-overlay__input"
              aria-label="Search artists, albums, and tracks"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
              placeholder="Search the stacks…"
              value={query}
              onChange={(e) => {
                const next = e.target.value;
                setQuery(next);
                if (routeInstantYear(next)) return;
              }}
            />
            <button type="submit" className="home-search-overlay__submit">
              Go
            </button>
          </form>
        </header>

        <div className="home-search-overlay__scroll">
          {trimmed.length < 2 ? (
            <p className="home-search-suggestions__status" role="status">
              Type to search artists, albums, tracks, or an RV year.
            </p>
          ) : isYearPowerRoute ? (
            <p className="home-search-suggestions__status" role="status">
              Press Go to open RV {trimmed}.
            </p>
          ) : showResults ? (
            <HomeSearchSuggestions
              className="home-search-overlay-results"
              groups={suggestions}
              loading={suggestLoading}
              rvYearIntent={rvYearIntent}
              onSelect={routeFromSuggestion}
            />
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
