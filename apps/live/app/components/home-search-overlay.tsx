"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { fetchSearchSuggestions } from "@/lib/search/fetch-suggestions";
import {
  EMPTY_SUGGESTION_GROUPS,
  type SearchSuggestionItem,
} from "@/lib/search/search-suggestion-types";
import { suggestionGroupsHaveResults } from "@/lib/search/pick-first-suggestion";
import { resolveHighConfidenceDestination } from "@/lib/search/resolve-search-destination";
import { navigateToDiscoverySearch, navigateToEntityRoute } from "@/lib/search/navigate-entity";
import { resolveSuggestionHref } from "@/lib/search/resolve-suggestion-href";
import {
  isRvYearOnlyQuery,
  resolveInstantRvYearRoute,
  resolveRvYearOnlyQuery,
  resolveYearOnlySearchHref,
} from "@/lib/rv-year/rv-year-intent";
import { yearSuggestionHref } from "@/lib/search/entity-routes";
import {
  filterSuggestionGroupsByScope,
  scopeSearchLabel,
  scopeSearchPlaceholder,
  type HomeSearchScope,
} from "@/lib/search/home-search-scope";

import { HomeSearchOverlayRecovery } from "./home-search-overlay-recovery";
import { HomeSearchOverlaySearching } from "./home-search-overlay-searching";
import { HomeSearchSuggestions } from "./home-search-suggestions";
import "./home-search-overlay.css";

const DEBOUNCE_MS = 150;

type OverlayPhase = "idle" | "year" | "searching" | "results" | "empty" | "error";

type Props = {
  onClose: () => void;
  scope?: HomeSearchScope;
};

export function HomeSearchOverlay({ onClose, scope = "all" }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const [mounted, setMounted] = useState(false);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState(EMPTY_SUGGESTION_GROUPS);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [rvYearIntent, setRvYearIntent] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const trimmed = query.trim();
  const isYearPowerRoute = isRvYearOnlyQuery(trimmed);
  const displaySuggestions = useMemo(
    () => filterSuggestionGroupsByScope(suggestions, scope),
    [suggestions, scope],
  );
  const hasResults = suggestionGroupsHaveResults(displaySuggestions);
  const scopeLabel = scopeSearchLabel(scope);

  const phase: OverlayPhase = useMemo(() => {
    if (trimmed.length < 2) return "idle";
    if (isYearPowerRoute) return "year";
    if (suggestLoading && !hasResults) return "searching";
    if (suggestLoading && hasResults) return "results";
    if (hasResults) return "results";
    if (searchError) return "error";
    return "empty";
  }, [trimmed.length, isYearPowerRoute, suggestLoading, hasResults, searchError]);

  const resolvedYear = useMemo(() => {
    if (!isYearPowerRoute) return null;
    return resolveInstantRvYearRoute(trimmed) ?? resolveRvYearOnlyQuery(trimmed);
  }, [trimmed, isYearPowerRoute]);

  const yearOnlyHref = useMemo(() => resolveYearOnlySearchHref(trimmed), [trimmed]);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("home-search-overlay-open");

    const focusTimer = window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(focusTimer);
      document.documentElement.classList.remove("home-search-overlay-open");
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const navigateTo = useCallback(
    (href: string) => {
      navigateToEntityRoute(router, href, onClose);
    },
    [router, onClose],
  );

  useEffect(() => {
    if (yearOnlyHref) {
      navigateTo(yearOnlyHref);
    }
  }, [yearOnlyHref, navigateTo]);

  const routeFromSuggestion = useCallback(
    (item: SearchSuggestionItem) => {
      const href = resolveSuggestionHref(item);
      if (!href) return;
      navigateTo(href);
    },
    [navigateTo],
  );

  const openDiscoverySearch = useCallback(() => {
    navigateToDiscoverySearch(router, trimmed, onClose);
  }, [router, trimmed, onClose]);

  const handleEnterKey = useCallback(() => {
    if (isYearPowerRoute && resolvedYear != null) {
      navigateTo(yearSuggestionHref(resolvedYear));
      return;
    }
    if (trimmed.length < 2) return;

    const highConfidence = resolveHighConfidenceDestination(trimmed, displaySuggestions);
    if (highConfidence) {
      navigateTo(highConfidence.href);
      return;
    }

    openDiscoverySearch();
  }, [
    isYearPowerRoute,
    resolvedYear,
    trimmed,
    displaySuggestions,
    navigateTo,
    openDiscoverySearch,
  ]);

  useEffect(() => {
    if (trimmed.length < 2) {
      requestIdRef.current += 1;
      setSuggestions(EMPTY_SUGGESTION_GROUPS);
      setSuggestLoading(false);
      setRvYearIntent(false);
      setSearchError(null);
      return;
    }

    if (isRvYearOnlyQuery(trimmed)) {
      requestIdRef.current += 1;
      setSuggestions(EMPTY_SUGGESTION_GROUPS);
      setSuggestLoading(false);
      setRvYearIntent(false);
      setSearchError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setSuggestLoading(true);
    setSearchError(null);

    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      fetchSearchSuggestions(trimmed, controller.signal)
        .then((result) => {
          if (requestId !== requestIdRef.current) return;
          if (result.ok) {
            setSuggestions(result.suggestions);
            setRvYearIntent(result.rvYearIntent === true);
            setSearchError(result.error ?? null);
          } else {
            setSuggestions(EMPTY_SUGGESTION_GROUPS);
            setRvYearIntent(false);
            setSearchError(result.error ?? "Search unavailable");
          }
          setSuggestLoading(false);
        })
        .catch((err) => {
          if (requestId !== requestIdRef.current) return;
          if (err instanceof DOMException && err.name === "AbortError") return;
          setSuggestions(EMPTY_SUGGESTION_GROUPS);
          setSearchError(
            err instanceof Error ? err.message : "Search request failed",
          );
          setSuggestLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
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
            <p className="home-search-overlay__kicker">
              {scopeLabel ? `Archive terminal · ${scopeLabel}` : "Archive terminal"}
            </p>
            <button
              type="button"
              className="home-search-overlay__close"
              onClick={onClose}
            >
              Close
            </button>
          </div>
          <div className="home-search-overlay__field-wrap" role="search">
            <input
              ref={inputRef}
              type="search"
              inputMode="search"
              className="home-search-overlay__input"
              aria-label="Search artists, albums, and tracks"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
              placeholder={scopeSearchPlaceholder(scope)}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleEnterKey();
                }
              }}
            />
          </div>
        </header>

        <div className="home-search-overlay__scroll">
          {phase === "idle" ? (
            <HomeSearchOverlayRecovery mode="idle" onNavigate={navigateTo} />
          ) : null}

          {phase === "year" && resolvedYear != null ? (
            <div className="home-search-overlay-year">
              <p className="home-search-overlay-year__label">RV Year</p>
              <button
                type="button"
                className="home-search-overlay-year__open"
                onClick={() => navigateTo(yearSuggestionHref(resolvedYear))}
              >
                Open RV {resolvedYear}
              </button>
            </div>
          ) : null}

          {phase === "searching" ? (
            <>
              <HomeSearchOverlaySearching />
              <div className="home-search-overlay__view-all-only">
                <button
                  type="button"
                  className="home-search-suggestions__view-all"
                  onClick={openDiscoverySearch}
                >
                  View All Results
                </button>
              </div>
            </>
          ) : null}

          {phase === "results" ? (
            <>
              {suggestLoading ? <HomeSearchOverlaySearching compact /> : null}
              <HomeSearchSuggestions
                className="home-search-overlay-results"
                overlayMode
                pending={suggestLoading}
                highlightQuery={trimmed}
                groups={displaySuggestions}
                loading={false}
                rvYearIntent={rvYearIntent}
                query={trimmed}
                onSelect={routeFromSuggestion}
                onDismiss={onClose}
                onViewAll={openDiscoverySearch}
              />
            </>
          ) : null}

          {phase === "error" ? (
            <div className="home-search-overlay-error" role="alert">
              <p className="home-search-overlay-error__lead">
                Archive index unreachable.
              </p>
              <p className="home-search-overlay-error__detail">{searchError}</p>
              <p className="home-search-overlay-error__hint">
                Check RETROVERSE_PG_* connection on the server.
              </p>
            </div>
          ) : null}

          {phase === "empty" ? (
            <>
              <HomeSearchOverlayRecovery
                mode="empty"
                query={trimmed}
                onNavigate={navigateTo}
              />
              <div className="home-search-overlay__view-all-only">
                <button
                  type="button"
                  className="home-search-suggestions__view-all"
                  onClick={openDiscoverySearch}
                >
                  View All Results
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
