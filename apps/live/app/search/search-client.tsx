"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import { isAbortError } from "@/lib/search/fetch-search";
import {
  EMPTY_CURATED_SEARCH_GROUPS,
  type CuratedSearchGroups,
  type SearchSuggestionItem,
} from "@/lib/search/search-suggestion-types";

type CatalogSearchResponse = {
  ok: boolean;
  curated: CuratedSearchGroups;
};

function ResultGroup({
  title,
  children,
  emphasis = false,
}: {
  title: string;
  children: ReactNode;
  emphasis?: boolean;
}) {
  const id = `archive-search-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section
      className={emphasis ? "archive-search__group archive-search__group--best" : "archive-search__group"}
      aria-labelledby={id}
    >
      <h2 id={id}>{title}</h2>
      <div className="archive-search__list">{children}</div>
    </section>
  );
}

function ResultCard({
  href,
  title,
  detail,
  year,
  artwork,
}: {
  href: string;
  title: string;
  detail?: string | null;
  year?: number | null;
  artwork?: string | null;
}) {
  return (
    <Link href={href} className="archive-search__result">
      <span className="archive-search__art" aria-hidden>
        {artwork ? <img src={artwork} alt="" /> : title.slice(0, 1)}
      </span>
      <span className="archive-search__copy">
        <span className="archive-search__title">{title}</span>
        {detail ? <span className="archive-search__detail">{detail}</span> : null}
      </span>
      {year ? <span className="archive-search__year">{year}</span> : null}
    </Link>
  );
}

function ResultItem({ item }: { item: SearchSuggestionItem }) {
  return (
    <ResultCard
      href={item.href}
      title={item.title}
      detail={item.kind === "song" || item.kind === "album" ? item.artist : null}
      year={item.kind === "year" ? null : item.year}
      artwork={item.coverUrl}
    />
  );
}

export default function SearchClient() {
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<CuratedSearchGroups>(EMPTY_CURATED_SEARCH_GROUPS);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const requestRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmedQuery = query.trim();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      requestRef.current += 1;
      setGroups(EMPTY_CURATED_SEARCH_GROUPS);
      setLoading(false);
      setFailed(false);
      return;
    }

    const requestId = ++requestRef.current;
    let controller: AbortController | null = null;
    setLoading(true);
    setFailed(false);
    const timer = window.setTimeout(() => {
      controller = new AbortController();
      fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`, { signal: controller.signal })
        .then(async (response) => {
          const body = (await response.json()) as CatalogSearchResponse;
          if (!response.ok || !body.ok) throw new Error("Catalog search failed");
          if (requestId !== requestRef.current) return;
          setGroups(body.curated ?? EMPTY_CURATED_SEARCH_GROUPS);
        })
        .catch((error) => {
          if (!isAbortError(error) && requestId === requestRef.current) {
            setGroups(EMPTY_CURATED_SEARCH_GROUPS);
            setFailed(true);
          }
        })
        .finally(() => {
          if (requestId === requestRef.current) setLoading(false);
        });
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller?.abort();
    };
  }, [trimmedQuery]);

  const hasResults =
    groups.bestMatch.length +
      groups.artists.length +
      groups.popularSongs.length +
      groups.albums.length +
      groups.otherMatches.length >
    0;
  const showNoResults = trimmedQuery.length >= 2 && !loading && !hasResults;

  return (
    <Rv2PublicShell className="rv2-search" broadcastChrome>
      <section className="archive-search" aria-label="Search Retroverse">
        <label className="archive-search__label" htmlFor="archive-search-input">
          Search Retroverse
        </label>
        <div className="archive-search__field-wrap">
          <svg className="archive-search__icon" viewBox="0 0 24 24" aria-hidden>
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            ref={inputRef}
            id="archive-search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search songs, artists, albums, years..."
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              ×
            </button>
          ) : null}
        </div>

        {trimmedQuery.length === 0 ? (
          <p className="archive-search__state archive-search__state--idle">Start typing to explore.</p>
        ) : null}
        {loading && !hasResults ? <p className="archive-search__state" role="status">Searching…</p> : null}
        {showNoResults || (failed && !hasResults) ? (
          <p className="archive-search__state" role="status">No matching results.</p>
        ) : null}

        {hasResults ? (
          <div className={loading ? "archive-search__results archive-search__results--loading" : "archive-search__results"}>
            {groups.bestMatch.length ? (
              <ResultGroup title="Best Match" emphasis>
                {groups.bestMatch.map((item) => <ResultItem key={item.id} item={item} />)}
              </ResultGroup>
            ) : null}
            {groups.artists.length ? (
              <ResultGroup title="Artists">
                {groups.artists.map((item) => <ResultItem key={item.id} item={item} />)}
              </ResultGroup>
            ) : null}
            {groups.popularSongs.length ? (
              <ResultGroup title="Popular Songs">
                {groups.popularSongs.map((item) => <ResultItem key={item.id} item={item} />)}
              </ResultGroup>
            ) : null}
            {groups.albums.length ? (
              <ResultGroup title="Albums">
                {groups.albums.map((item) => <ResultItem key={item.id} item={item} />)}
              </ResultGroup>
            ) : null}
            {groups.otherMatches.length ? (
              <ResultGroup title="Other Matches">
                {groups.otherMatches.map((item) => <ResultItem key={item.id} item={item} />)}
              </ResultGroup>
            ) : null}
          </div>
        ) : null}
      </section>
    </Rv2PublicShell>
  );
}
