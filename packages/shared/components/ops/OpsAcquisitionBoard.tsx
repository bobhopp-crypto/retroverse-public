"use client";

import { useEffect, useMemo, useState } from "react";

import {
  type AcquisitionFilter,
  acquisitionStats,
  downloadTextFile,
  exportCsv,
  exportJson,
  exportTitleList,
  exportUrlList,
  filterYearMatchRows,
  openSearchLinkPage,
  rowsToExportPayload,
} from "@/lib/ops/acquisition-export";
import { buildYouTubeSearchUrl } from "@/lib/ops/youtube-search";
import type { MatchStatus, YearMatchRow } from "@/lib/ops/types";
import { OpsInlineLink, OpsPill, OpsTable } from "@/components/ops/OpsTable";

const FILTERS: { id: AcquisitionFilter; label: string }[] = [
  { id: "acquisition", label: "Acquisition" },
  { id: "all", label: "All" },
  { id: "missing", label: "Missing" },
  { id: "possible", label: "Possible" },
  { id: "matched", label: "Matched" },
];

function toneForMatch(status: MatchStatus): "ok" | "warn" | "bad" | "info" {
  if (status === "matched") return "ok";
  if (status === "possible_match") return "info";
  if (status === "needs_review") return "warn";
  if (status === "ignored") return "info";
  return "bad";
}

function matchLabel(status: MatchStatus) {
  return status.replaceAll("_", " ").toUpperCase();
}

export default function OpsAcquisitionBoard(props: {
  year: number;
  initialRows: YearMatchRow[];
  acquisitionQueueSize: number;
  pgOk: boolean;
  pgError?: string;
}) {
  const [rows, setRows] = useState(props.initialRows);
  const [loading, setLoading] = useState(props.initialRows.length === 0 && props.pgOk);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AcquisitionFilter>("acquisition");
  const [exportIds, setExportIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!props.pgOk || props.initialRows.length > 0) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/ops/year-match");
        if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
        const data = (await res.json()) as { yearMatch: YearMatchRow[] };
        if (!cancelled) setRows(data.yearMatch);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.pgOk, props.initialRows.length]);

  const filtered = useMemo(
    () => filterYearMatchRows(rows, filter),
    [rows, filter],
  );

  const exportSource = useMemo(() => {
    if (exportIds.size === 0) return filtered;
    return filtered.filter((r) => exportIds.has(r.id));
  }, [filtered, exportIds]);

  const exportRows = useMemo(() => rowsToExportPayload(exportSource), [exportSource]);
  const stats = useMemo(() => acquisitionStats(rows), [rows]);

  function toggleExport(id: string) {
    setExportIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setExportIds(new Set(filtered.map((r) => r.id)));
  }

  function clearExportSelection() {
    setExportIds(new Set());
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`Copied ${label} (${exportRows.length} rows).`);
    } catch {
      setNotice(`Copy failed — use Export instead.`);
    }
  }

  const tableRows = filtered.map((row) => {
    const tone = toneForMatch(row.matchStatus);
    const checked = exportIds.has(row.id);
    const yt = buildYouTubeSearchUrl(row.artist, row.title);
    return {
      id: row.id,
      tone,
      cells: {
        rank: row.displayRank ?? "—",
        artist: <span className="ops-strong">{row.artist}</span>,
        title: row.title,
        peak: row.peak ?? "—",
        weeks: row.weeks,
        status: <OpsPill tone={tone}>{matchLabel(row.matchStatus)}</OpsPill>,
        best: (
          <span className="ops-wrap ops-dim">{row.bestMatch || "—"}</span>
        ),
        youtube: (
          <OpsInlineLink href={yt} external>
            Search →
          </OpsInlineLink>
        ),
        export: (
          <label className="ops-check">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggleExport(row.id)}
            />{" "}
            Export
          </label>
        ),
      },
    };
  });

  return (
    <>
      <section className="ops-panel ops-panel--info">
        <header className="ops-panel__header">
          <div className="ops-panel__titleblock">
            <h2 className="ops-panel__title">{props.year} Hot 100 acquisition universe</h2>
            <p className="ops-panel__subtitle">
              YouTube search manifests for Billboard chart rows — no downloads, no scraping.
            </p>
          </div>
          <div className="ops-panel__count">{stats.chartRows} chart rows</div>
        </header>
        <div className="ops-panel__body ops-stats-row">
          <span>
            Matched <strong>{stats.matched}</strong>
          </span>
          <span>
            Missing <strong>{stats.missing}</strong>
          </span>
          <span>
            Possible <strong>{stats.possible}</strong>
          </span>
          <span>
            Acquisition target <strong>{stats.acquisition}</strong>
          </span>
          <span>
            Queued <strong>{props.acquisitionQueueSize}</strong>
          </span>
        </div>
      </section>

      {!props.pgOk ? (
        <p className="ops-banner ops-banner--bad">
          Postgres offline{props.pgError ? `: ${props.pgError}` : ""}.
        </p>
      ) : null}
      {loadError ? <p className="ops-banner ops-banner--bad">{loadError}</p> : null}
      {loading ? <p className="ops-dim">Loading chart rows…</p> : null}
      {notice ? <p className="ops-banner">{notice}</p> : null}

      <section className="ops-panel">
        <header className="ops-panel__header">
          <div className="ops-panel__titleblock">
            <h2 className="ops-panel__title">Filters</h2>
            <p className="ops-panel__subtitle">
              Default: Acquisition (missing + possible). Exports follow filter unless rows are
              checked.
            </p>
          </div>
          <div className="ops-panel__count">{filtered.length} shown</div>
        </header>
        <div className="ops-panel__body">
          <div className="ops-filters">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`ops-filter${filter === f.id ? " ops-filter--active" : ""}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="ops-panel">
        <header className="ops-panel__header">
          <div className="ops-panel__titleblock">
            <h2 className="ops-panel__title">Export</h2>
            <p className="ops-panel__subtitle">
              {exportIds.size > 0
                ? `${exportIds.size} row(s) selected for export`
                : `${exportRows.length} row(s) from current filter`}
            </p>
          </div>
        </header>
        <div className="ops-panel__body ops-export-bar">
          <button
            type="button"
            className="ops-btn ops-btn--ok"
            disabled={exportRows.length === 0}
            onClick={() =>
              downloadTextFile(
                `retroverse-${props.year}-acquisition.csv`,
                exportCsv(exportRows),
                "text/csv;charset=utf-8",
              )
            }
          >
            Export CSV
          </button>
          <button
            type="button"
            className="ops-btn ops-btn--ok"
            disabled={exportRows.length === 0}
            onClick={() =>
              downloadTextFile(
                `retroverse-${props.year}-acquisition.json`,
                exportJson(exportRows),
                "application/json;charset=utf-8",
              )
            }
          >
            Export JSON
          </button>
          <button
            type="button"
            className="ops-btn ops-btn--ok"
            disabled={exportRows.length === 0}
            onClick={() =>
              downloadTextFile(
                `retroverse-${props.year}-youtube-urls.txt`,
                exportUrlList(exportRows),
              )
            }
          >
            Export URL List
          </button>
          <button
            type="button"
            className="ops-btn ops-btn--info"
            disabled={exportRows.length === 0}
            onClick={() => void copyText(exportUrlList(exportRows), "URLs")}
          >
            Copy URLs
          </button>
          <button
            type="button"
            className="ops-btn ops-btn--info"
            disabled={exportRows.length === 0}
            onClick={() => void copyText(exportTitleList(exportRows), "titles")}
          >
            Copy Titles
          </button>
          <button
            type="button"
            className="ops-btn ops-btn--warn"
            disabled={exportRows.length === 0}
            onClick={() => openSearchLinkPage(exportRows, 25)}
          >
            Open Top 25 Searches
          </button>
          <button type="button" className="ops-btn ops-btn--info" onClick={selectAllFiltered}>
            Select all shown
          </button>
          <button
            type="button"
            className="ops-btn ops-btn--info"
            disabled={exportIds.size === 0}
            onClick={clearExportSelection}
          >
            Clear selection
          </button>
        </div>
      </section>

      <section className="ops-panel">
        <header className="ops-panel__header">
          <div className="ops-panel__titleblock">
            <h2 className="ops-panel__title">Chart rows</h2>
          </div>
        </header>
        <div className="ops-panel__body">
          <OpsTable
            empty="No rows for this filter."
            columns={[
              { key: "rank", label: "Rank", align: "right" },
              { key: "artist", label: "Artist" },
              { key: "title", label: "Title" },
              { key: "peak", label: "Peak", align: "right" },
              { key: "weeks", label: "Weeks", align: "right" },
              { key: "status", label: "Match Status" },
              { key: "best", label: "Best Match" },
              { key: "youtube", label: "YouTube Search" },
              { key: "export", label: "Add To Export" },
            ]}
            rows={tableRows}
          />
        </div>
      </section>
    </>
  );
}
