"use client";

import { useEffect, useRef } from "react";

import { subjectFromTitle } from "@/lib/ops/media-lab/harvest/filenames";
import {
  formatSearchTimestamp,
  type TimelineSearchHit,
} from "@/lib/ops/media-lab/timeline-transcript-search";

type TimelineSearchResultsPanelProps = {
  hits: TimelineSearchHit[];
  showDurationSec: number;
  activeIndex: number;
  onSelectHit: (hit: TimelineSearchHit, index: number) => void;
  onNavigate: (direction: "next" | "prev") => void;
};

export function TimelineSearchResultsPanel(props: TimelineSearchResultsPanelProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [props.activeIndex]);

  function handleListKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      props.onNavigate("next");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      props.onNavigate("prev");
    }
  }

  return (
    <div className="ops-ml-search-results">
      <header className="ops-ml-search-results__head">
        <h4 className="ops-ml-search-results__title">Search Results</h4>
        <span className="ops-ml-search-results__count">
          {props.hits.length} match{props.hits.length === 1 ? "" : "es"}
        </span>
      </header>
      {props.hits.length === 0 ? (
        <p className="ops-ml-search-results__empty">No matches</p>
      ) : (
        <ul
          ref={listRef}
          className="ops-ml-search-results__list"
          role="listbox"
          aria-label="Search results"
          tabIndex={0}
          onKeyDown={handleListKeyDown}
        >
          {props.hits.map((hit, index) => {
            const isActive = index === props.activeIndex;
            const label = subjectFromTitle(hit.chapter.title);
            return (
              <li key={`${hit.chapterId}-${hit.matchSec}`} role="presentation">
                <button
                  ref={isActive ? activeRef : undefined}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={`ops-ml-search-results__row${
                    isActive ? " ops-ml-search-results__row--active" : ""
                  }`}
                  onClick={() => props.onSelectHit(hit, index)}
                >
                  <span className="ops-ml-search-results__time">
                    {formatSearchTimestamp(hit.matchSec, props.showDurationSec)}
                  </span>
                  <span className="ops-ml-search-results__label">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
