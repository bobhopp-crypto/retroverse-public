"use client";

import { useMemo, useState } from "react";

import { OpsPill, OpsTable } from "@/components/ops/OpsTable";
import { RV_TAG_VOCABULARY } from "@/lib/ops/rvtags-review/vocabulary";
import type { RvTagId } from "@/lib/ops/rvtags-review/vocabulary";
import {
  DEFAULT_REVIEW_ROW_FILTER,
  type ReviewRowFilter,
} from "@/lib/ops/year-workspace/review-filters";
import {
  ownershipLabel,
  ownershipTone,
} from "@/lib/ops/year-workspace/ownership";
import {
  REVIEW_CLASSIFICATIONS,
  type ReviewClassification,
} from "@/lib/ops/year-workspace/review-types";
import type { YearWorkspaceRow } from "@/lib/ops/year-workspace/types";

const TAG_LABEL = new Map(RV_TAG_VOCABULARY.map((t) => [t.id, t.label]));

function tagLabel(id: RvTagId): string {
  return TAG_LABEL.get(id) ?? id;
}

function RetroverseTagsCell(props: {
  tags: RvTagId[];
  source: YearWorkspaceRow["retroverseTagsSource"];
}) {
  if (props.tags.length === 0) {
    return <span className="ops-dim">—</span>;
  }

  const sourceHint =
    props.source === "canonical"
      ? "Canonical Retroverse Tags (RVTR)"
      : props.source === "legacy_review"
        ? "Legacy review record — migrate to RVTR store"
        : props.source === "vdj_import"
          ? "VDJ User2 import hint (not canonical until saved on RVTR)"
          : "No Retroverse Tags";

  return (
    <span
      className="ops-ru-tags ops-ru-tags--system"
      title={`${sourceHint} · Retroverse owns tags; VDJ is consumer only`}
      data-tags-source={props.source}
      data-rvtr-canonical={props.source === "canonical" ? "true" : "false"}
      data-tags-editable="false"
    >
      {props.tags.map((id) => (
        <span key={id} className="ops-ru-tags__chip">
          {tagLabel(id)}
        </span>
      ))}
    </span>
  );
}

function ClassCell(props: {
  row: YearWorkspaceRow;
  disabled: boolean;
  onChange: (row: YearWorkspaceRow, value: ReviewClassification) => void;
}) {
  return (
    <label className="ops-ru-class">
      <span className="visually-hidden">Class for {props.row.title}</span>
      <select
        className="ops-ru-class__select"
        value={props.row.classification}
        disabled={props.disabled}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) =>
          props.onChange(props.row, e.target.value as ReviewClassification)
        }
      >
        {REVIEW_CLASSIFICATIONS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      {props.row.classificationAutoPromoted ? (
        <span className="ops-ru-class__auto" title="Suggested Cocktail from VDJ rotation signal (not a factual play count)">
          suggested
        </span>
      ) : null}
    </label>
  );
}

export function ReviewUniverseTable(props: {
  rows: YearWorkspaceRow[];
  totalRows: number;
  videoUniverseMode?: boolean;
  filter: ReviewRowFilter;
  focusKey: string | null;
  busyKeys: Set<string>;
  onFilterChange: (filter: ReviewRowFilter) => void;
  onRowFocus: (row: YearWorkspaceRow) => void;
  onClassChange: (row: YearWorkspaceRow, classification: ReviewClassification) => void;
  onBulkClassChange: (workspaceKeys: string[], classification: ReviewClassification) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkClass, setBulkClass] = useState<ReviewClassification>("Cocktail");

  const allKeys = useMemo(
    () => props.rows.map((r) => r.workspaceKey),
    [props.rows],
  );
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selected.has(k));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allKeys));
    }
  }

  function toggleKey(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function patchFilter(patch: Partial<ReviewRowFilter>) {
    props.onFilterChange({ ...props.filter, ...patch });
  }

  const tableRows = props.rows.map((row) => {
    const busy = props.busyKeys.has(row.workspaceKey);
    const focused = props.focusKey === row.workspaceKey;
    return {
      id: row.workspaceKey,
      tone: ownershipTone(row.ownership),
      className: focused ? "ops-ru-row--focus" : undefined,
      onClick: () => props.onRowFocus(row),
      cells: {
        select: (
          <input
            type="checkbox"
            className="ops-ru-check"
            checked={selected.has(row.workspaceKey)}
            disabled={busy}
            onChange={() => toggleKey(row.workspaceKey)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${row.artist} — ${row.title}`}
          />
        ),
        peak:
          row.graphTrackId != null && row.peak != null ? (
            <span className="ops-mono">#{row.peak}</span>
          ) : (
            <span className="ops-dim">—</span>
          ),
        weeks:
          row.graphTrackId != null && row.weeks != null ? (
            <span className="ops-mono">{row.weeks}</span>
          ) : (
            <span className="ops-dim">—</span>
          ),
        ownership: (
          <OpsPill tone={ownershipTone(row.ownership)}>
            {ownershipLabel(row.ownership)}
          </OpsPill>
        ),
        artist: <span className="ops-strong">{row.artist}</span>,
        title: row.title,
        playCount:
          row.playCount != null ? (
            <span className="ops-mono">{row.playCount}</span>
          ) : (
            <span className="ops-dim">—</span>
          ),
        class: (
          <ClassCell
            row={row}
            disabled={busy}
            onChange={props.onClassChange}
          />
        ),
        tags: (
          <RetroverseTagsCell tags={row.historicalTags} source={row.retroverseTagsSource} />
        ),
      },
    };
  });

  const showChartCols = props.videoUniverseMode !== false;

  const columns = [
    { key: "select", label: "" },
    ...(showChartCols
      ? [
          { key: "peak", label: "Peak" },
          { key: "weeks", label: "Weeks", align: "right" as const },
        ]
      : []),
    { key: "ownership", label: "Ownership" },
    { key: "artist", label: "Artist" },
    { key: "title", label: "Title" },
    { key: "playCount", label: "Rotation", align: "right" as const },
    { key: "class", label: "Class" },
    { key: "tags", label: "Retroverse Tags" },
  ];

  return (
    <section className="ops-ru" aria-label="Review universe table">
      <div className="ops-ru-filters" role="group" aria-label="Row filters">
        <input
          type="search"
          className="ops-ru-filters__search"
          placeholder="Search artist, title, RVTR…"
          value={props.filter.q}
          onChange={(e) => patchFilter({ q: e.target.value })}
        />
        <select
          className="ops-ru-class__select"
          value={props.filter.vdjMatch}
          onChange={(e) =>
            patchFilter({
              vdjMatch: e.target.value as ReviewRowFilter["vdjMatch"],
            })
          }
        >
          <option value="all">All chart link</option>
          <option value="matched">Chart linked</option>
          <option value="missing">Video only</option>
          <option value="review">Review</option>
        </select>
        <select
          className="ops-ru-class__select"
          value={props.filter.ownership}
          onChange={(e) =>
            patchFilter({
              ownership: e.target.value as ReviewRowFilter["ownership"],
            })
          }
        >
          <option value="all">All ownership</option>
          <option value="video">Video</option>
          <option value="audio">Audio</option>
          <option value="missing">Missing</option>
        </select>
        <select
          className="ops-ru-class__select"
          value={props.filter.classification}
          onChange={(e) =>
            patchFilter({
              classification: e.target.value as ReviewRowFilter["classification"],
            })
          }
        >
          <option value="all">All class</option>
          {REVIEW_CLASSIFICATIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="ops-ru-filters__check">
          <input
            type="checkbox"
            checked={props.filter.needsReviewOnly}
            onChange={(e) => patchFilter({ needsReviewOnly: e.target.checked })}
          />
          Needs review
        </label>
        <label className="ops-ru-filters__check">
          <input
            type="checkbox"
            checked={props.filter.hasTagsOnly}
            onChange={(e) => patchFilter({ hasTagsOnly: e.target.checked })}
          />
          Has tags
        </label>
        <button
          type="button"
          className="ops-btn"
          onClick={() => props.onFilterChange(DEFAULT_REVIEW_ROW_FILTER)}
        >
          Reset filters
        </button>
      </div>

      <div className="ops-ru__toolbar">
        <p className="ops-ru__count">
          <strong>{props.rows.length}</strong>
          {props.rows.length !== props.totalRows
            ? ` of ${props.totalRows}`
            : ""}{" "}
          {props.videoUniverseMode ? "performance videos" : "Hot 100 songs"}
          <span className="ops-dim"> · click row for active-year Hot 100</span>
        </p>
        <div className="ops-ru-bulk">
          <button type="button" className="ops-btn" onClick={toggleAll}>
            {allSelected ? "Clear selection" : "Select all"}
          </button>
          <label className="ops-ru-bulk__label">
            Bulk class
            <select
              className="ops-ru-class__select"
              value={bulkClass}
              onChange={(e) => setBulkClass(e.target.value as ReviewClassification)}
            >
              {REVIEW_CLASSIFICATIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="ops-btn ops-btn--info"
            disabled={selected.size === 0 || props.busyKeys.size > 0}
            onClick={() => props.onBulkClassChange([...selected], bulkClass)}
          >
            Apply to {selected.size || "0"} selected
          </button>
        </div>
      </div>

      <OpsTable
        columns={columns}
        rows={tableRows}
        empty="No rows match the current filters."
      />
    </section>
  );
}
