"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchSearchSuggestions } from "@/lib/search/fetch-suggestions";
import {
  EMPTY_SUGGESTION_GROUPS,
  type SearchSuggestionGroups,
  type SearchSuggestionItem,
} from "@/lib/search/search-suggestion-types";
import { suggestionGroupsHaveResults } from "@/lib/search/pick-first-suggestion";

const DEBOUNCE_MS = 150;
const RVTR_RE = /^RVTR\d{6}$/i;
const RVAR_RE = /^RVAR\d{6}$/i;
const RVAL_RE = /^RVAL\d{6}$/i;

export type ExplorerSelection =
  | { kind: "song"; rvtr: string; label: string; rvId: string | null }
  | { kind: "artist"; rvar?: string; artist: string; rvId: string | null }
  | { kind: "album"; rval: string; label: string; rvId: string | null };

type Props = {
  onSelect: (selection: ExplorerSelection) => void;
  disabled?: boolean;
};

const SECTIONS: { key: keyof SearchSuggestionGroups; label: string; icon: string }[] = [
  { key: "artists", label: "Artists", icon: "👤" },
  { key: "albums", label: "Albums", icon: "💿" },
  { key: "songs", label: "Songs", icon: "🎵" },
];

function rvIdFromItem(item: SearchSuggestionItem): string | null {
  if (item.rvId?.trim()) return item.rvId.trim().toUpperCase();
  const hrefMatch = item.href.match(/\/(RVTR|RVAR|RVAL)\d{6}/i);
  if (hrefMatch?.[0]) return hrefMatch[0].toUpperCase();
  if (item.kind === "song") {
    const trackMatch = item.href.match(/\/(?:track|tracks|retroverse-2\/song)\/(RVTR\d{6})/i);
    if (trackMatch?.[1]) return trackMatch[1].toUpperCase();
  }
  return null;
}

function selectionFromItem(item: SearchSuggestionItem): ExplorerSelection | null {
  const rvId = rvIdFromItem(item);

  if (item.kind === "song" || (rvId && RVTR_RE.test(rvId))) {
    const rvtr = rvId && RVTR_RE.test(rvId) ? rvId : rvId ?? "";
    if (!rvtr) return null;
    return { kind: "song", rvtr, label: item.title, rvId };
  }

  if (item.kind === "album" || (rvId && RVAL_RE.test(rvId))) {
    const rval = rvId && RVAL_RE.test(rvId) ? rvId : rvId ?? "";
    if (!rval) return null;
    return { kind: "album", rval, label: item.title, rvId };
  }

  if (item.kind === "artist" || (rvId && RVAR_RE.test(rvId))) {
    return {
      kind: "artist",
      rvar: rvId && RVAR_RE.test(rvId) ? rvId : undefined,
      artist: item.title,
      rvId,
    };
  }

  return null;
}

function idLine(item: SearchSuggestionItem): string | null {
  const rvId = rvIdFromItem(item);
  if (rvId) return rvId;
  if (item.kind === "artist") return null;
  return null;
}

export function ExplorerSearch({ onSelect, disabled = false }: Props) {
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
      const selection = selectionFromItem(item);
      if (!selection) return;
      onSelect(selection);
      setQuery("");
      setFocused(false);
      inputRef.current?.blur();
    },
    [onSelect],
  );

  return (
    <div className="rv-explorer__search-wrap" ref={rootRef}>
      <input
        ref={inputRef}
        id="rv-explorer-search"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="rv-explorer__search-input"
        placeholder="Search songs, artists, albums, years..."
        value={query}
        disabled={disabled}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setFocused(true)}
      />

      {showDropdown ? (
        <div className="rv-explorer__search-dropdown" role="listbox" aria-label="Search results">
          {loading && !hasResults ? (
            <p className="rv-explorer__search-status">Searching…</p>
          ) : null}
          {!loading && !hasResults ? (
            <p className="rv-explorer__search-status">No matches — try another spelling or ID.</p>
          ) : null}

          {SECTIONS.map(({ key, label, icon }) => {
            const items = suggestions[key];
            if (items.length === 0) return null;

            return (
              <div key={key} className="rv-explorer__search-section">
                <p className="rv-explorer__search-heading">{label}</p>
                <ul className="rv-explorer__search-list">
                  {items.map((item) => {
                    const id = idLine(item);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          className="rv-explorer__search-item"
                          role="option"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleSelect(item)}
                        >
                          <span className="rv-explorer__search-icon" aria-hidden>
                            {icon}
                          </span>
                          <span className="rv-explorer__search-copy">
                            <span className="rv-explorer__search-title">{item.title}</span>
                            {item.artist && key !== "artists" ? (
                              <span className="rv-explorer__search-sub">{item.artist}</span>
                            ) : null}
                            {id ? <span className="rv-explorer__search-id">{id}</span> : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
