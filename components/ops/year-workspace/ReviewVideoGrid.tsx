"use client";

import { useMemo } from "react";

import { ReviewVideoCard } from "@/components/ops/year-workspace/ReviewVideoCard";
import {
  bridgeForRow,
  type ActiveYearBridge,
} from "@/lib/ops/year-workspace/active-year-bridge";
import {
  DEFAULT_REVIEW_ROW_FILTER,
  filterReviewRows,
  sortReviewRowsForScan,
  type ReviewRowFilter,
} from "@/lib/ops/year-workspace/review-filters";
import {
  REVIEW_CLASSIFICATIONS,
  type ReviewClassification,
} from "@/lib/ops/year-workspace/review-types";
import type { RvTagId } from "@/lib/ops/rvtags-review/vocabulary";
import type { YearWorkspaceRow } from "@/lib/ops/year-workspace/types";

export function ReviewVideoGrid(props: {
  rows: YearWorkspaceRow[];
  totalRows: number;
  bridges: Record<string, ActiveYearBridge>;
  busyKeys: Set<string>;
  filter: ReviewRowFilter;
  onFilterChange: (filter: ReviewRowFilter) => void;
  onClassChange: (row: YearWorkspaceRow, classification: ReviewClassification) => void;
  onTagToggle: (row: YearWorkspaceRow, tagId: RvTagId) => void;
}) {
  const filtered = useMemo(() => {
    const base = filterReviewRows(props.rows, props.filter, props.bridges);
    return sortReviewRowsForScan(base, props.bridges);
  }, [props.rows, props.filter, props.bridges]);

  const bridgeArtistCount = useMemo(() => {
    const norms = new Set<string>();
    for (const row of props.rows) {
      const b = bridgeForRow(props.bridges, row);
      if (b && b.bridgeYears.length > 0) norms.add(row.artist.toLowerCase());
    }
    return norms.size;
  }, [props.rows, props.bridges]);

  function patchFilter(patch: Partial<ReviewRowFilter>) {
    props.onFilterChange({ ...props.filter, ...patch });
  }

  return (
    <section className="ops-ru-cards" aria-label="Video review cards">
      <div className="ops-ru-filters" role="group" aria-label="Filters">
        <input
          type="search"
          className="ops-ru-filters__search"
          placeholder="Search artist or title…"
          value={props.filter.q}
          onChange={(e) => patchFilter({ q: e.target.value })}
        />
        <button
          type="button"
          className={`ops-ru-class-filters__btn ops-ru-class-filters__btn--needs${props.filter.needsReviewOnly ? " ops-ru-class-filters__btn--on" : ""}`}
          onClick={() =>
            patchFilter({
              needsReviewOnly: !props.filter.needsReviewOnly,
              classification: "all",
            })
          }
        >
          Needs Review
        </button>
        <label className="ops-ru-filters__check ops-ru-filters__check--bridge">
          <input
            type="checkbox"
            checked={props.filter.bridgeOnly}
            onChange={(e) => patchFilter({ bridgeOnly: e.target.checked })}
          />
          Active years ({bridgeArtistCount})
        </label>
        <div className="ops-ru-class-filters" role="group" aria-label="Class filters">
          <button
            type="button"
            className={`ops-ru-class-filters__btn${props.filter.classification === "all" ? " ops-ru-class-filters__btn--on" : ""}`}
            onClick={() => patchFilter({ classification: "all", needsReviewOnly: false })}
          >
            All
          </button>
          {REVIEW_CLASSIFICATIONS.map((c) => (
            <button
              key={c}
              type="button"
              className={`ops-ru-class-filters__btn${props.filter.classification === c ? " ops-ru-class-filters__btn--on" : ""}`}
              onClick={() => patchFilter({ classification: c, needsReviewOnly: false })}
            >
              {c}
            </button>
          ))}
        </div>
        <select
          className="ops-ru-class__select"
          value={props.filter.hasTagsOnly ? "tagged" : "all"}
          onChange={(e) =>
            patchFilter({
              hasTagsOnly: e.target.value === "tagged",
            })
          }
        >
          <option value="all">All Retroverse Tags</option>
          <option value="tagged">Has tags</option>
        </select>
        <button
          type="button"
          className="ops-btn"
          onClick={() => props.onFilterChange(DEFAULT_REVIEW_ROW_FILTER)}
        >
          Reset
        </button>
      </div>

      <p className="ops-ru-cards__legend" aria-label="Active year legend">
        <span className="ops-ru-cards__legend-item ops-ru-cards__legend-item--gold">
          Gold = Active 1978 + 1992
        </span>
        <span className="ops-ru-cards__legend-item ops-ru-cards__legend-item--blue">
          Blue = Active 1978 or 1992
        </span>
        <span className="ops-ru-cards__legend-item">Active-year cards sort first</span>
      </p>

      <p className="ops-ru-cards__count">
        <strong>{filtered.length}</strong>
        {filtered.length !== props.totalRows ? ` of ${props.totalRows}` : ""} videos
      </p>

      <div className="ops-ru-cards__grid">
        {filtered.map((row) => (
          <ReviewVideoCard
            key={row.workspaceKey}
            row={row}
            bridge={bridgeForRow(props.bridges, row)}
            busy={props.busyKeys.has(row.workspaceKey)}
            onClassChange={(c) => props.onClassChange(row, c)}
            onTagToggle={(tagId) => props.onTagToggle(row, tagId)}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="ops-empty">No videos match the current filters.</p>
      ) : null}
    </section>
  );
}
