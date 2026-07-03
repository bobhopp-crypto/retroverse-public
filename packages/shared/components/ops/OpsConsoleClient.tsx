"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { OpsReviewModal } from "@/components/ops/OpsReviewModal";
import { OpsQueuePanel } from "@/components/ops/OpsQueuePanel";
import { OpsInlineLink, OpsPill, OpsTable } from "@/components/ops/OpsTable";
import { youtubeSearchUrl } from "@/lib/ops/match-status";
import type { OpsMatchOverride } from "@/lib/ops/ops-state-store";
import { recordToAcquisitionRow } from "@/lib/ops/acquisitions-from-state";
import type {
  AcquisitionRow,
  MatchStatus,
  OpsActivityRow,
  WeeklyRefreshStatus,
  YearMatchRow,
} from "@/lib/ops/types";

type YearFilter = "all" | "matched" | "missing" | "possible_match" | "acquisition";

const FILTERS: { id: YearFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "matched", label: "Matched" },
  { id: "missing", label: "Missing" },
  { id: "possible_match", label: "Possible" },
  { id: "acquisition", label: "Acquisition" },
];

function toneForMatch(status: MatchStatus) {
  if (status === "matched") return "ok";
  if (status === "possible_match") return "info";
  if (status === "needs_review") return "warn";
  if (status === "ignored") return "info";
  return "bad";
}

function matchLabel(status: MatchStatus) {
  return status.replaceAll("_", " ").toUpperCase();
}

function toneForConfidence(c: string) {
  if (c === "high") return "ok";
  if (c === "medium") return "warn";
  return "info";
}

function toneForPriority(p: AcquisitionRow["priority"]) {
  if (p === "high") return "bad";
  if (p === "medium") return "warn";
  return "info";
}

function chartItemIdFromEntity(entity: string): string | null {
  const m = entity.match(/^(chart-track-\d+)/);
  return m?.[1] ?? null;
}

function rvalFromEntity(entity: string): string | null {
  const m = entity.match(/^(RVAL\d+)/i);
  return m?.[1]?.toUpperCase() ?? null;
}

function noticeForOverride(o: OpsMatchOverride): string {
  if (o.matchStatus === "matched") return "Match approved";
  if (o.matchStatus === "missing") return "Match rejected";
  if (o.matchStatus === "ignored") return "Marked ignored";
  return "Match updated";
}

function activityFromOverride(o: OpsMatchOverride, action: string): OpsActivityRow {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  return {
    id: `act-local-${o.chartItemId}-${Date.now()}`,
    ts,
    entity: `${o.chartItemId} · ${o.bestMatch || "no media"}`,
    action: `match.${action}`,
    source: "ops/reconciliation-state",
    status: "ok",
  };
}

function applyOverride(row: YearMatchRow, o: OpsMatchOverride): YearMatchRow {
  return {
    ...row,
    matchStatus: o.matchStatus,
    confidence:
      o.matchStatus === "matched"
        ? "high"
        : o.matchStatus === "ignored"
          ? "low"
          : row.confidence,
    bestMatch: o.bestMatch ?? row.bestMatch,
    manualOverride: o.manualOverride,
    mediaId: o.mediaId,
    notes: o.notes,
    label: o.bestMatch ?? row.label,
    hasVdjMedia: o.matchStatus === "matched" ? true : row.hasVdjMedia,
  };
}

export default function OpsConsoleClient(props: {
  year: number;
  yearMatch: YearMatchRow[];
  acquisition: AcquisitionRow[];
  weeklyRefresh: WeeklyRefreshStatus;
  recentActivity: OpsActivityRow[];
  yearStats?: { chartRows: number; matched: number; missing: number };
}) {
  const [yearMatch, setYearMatch] = useState(props.yearMatch);
  const [yearLoading, setYearLoading] = useState(props.yearMatch.length === 0);
  const [yearLoadError, setYearLoadError] = useState<string | null>(null);
  const [acquisition, setAcquisition] = useState(props.acquisition);
  const [recentActivity, setRecentActivity] = useState(props.recentActivity);
  const [filter, setFilter] = useState<YearFilter>("all");
  const [reviewRow, setReviewRow] = useState<YearMatchRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [highlightRowId, setHighlightRowId] = useState<string | null>(null);
  const yearTableScrollRef = useRef<HTMLDivElement>(null);
  const yearScrollTopRef = useRef(0);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setYearMatch(props.yearMatch);
    setAcquisition(props.acquisition);
    setRecentActivity(props.recentActivity);
    if (props.yearMatch.length > 0) {
      setYearLoading(false);
      setYearLoadError(null);
    }
  }, [props.yearMatch, props.acquisition, props.recentActivity]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (props.yearMatch.length > 0) return;

    let cancelled = false;
    (async () => {
      setYearLoading(true);
      setYearLoadError(null);
      try {
        const res = await fetch("/api/ops/year-match");
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof body.error === "string" ? body.error : res.statusText || "Load failed",
          );
        }
        if (!cancelled) {
          setYearMatch(body.yearMatch ?? []);
          setYearLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setYearLoadError(e instanceof Error ? e.message : String(e));
          setYearLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [props.yearMatch.length]);

  const acquisitionIds = useMemo(
    () => new Set(acquisition.map((a) => a.chartItemId)),
    [acquisition],
  );

  const filteredRows = useMemo(() => {
    return yearMatch.filter((row) => {
      if (filter === "all") return true;
      if (filter === "matched") return row.matchStatus === "matched";
      if (filter === "missing") return row.matchStatus === "missing";
      if (filter === "possible_match") {
        return row.matchStatus === "possible_match" || row.matchStatus === "needs_review";
      }
      if (filter === "acquisition") return acquisitionIds.has(row.chartItemId);
      return true;
    });
  }, [yearMatch, filter, acquisitionIds]);

  const stats = useMemo(() => {
    const matched = yearMatch.filter((r) => r.matchStatus === "matched").length;
    const missing = yearMatch.filter((r) => r.matchStatus === "missing").length;
    return { chartRows: yearMatch.length, matched, missing };
  }, [yearMatch]);

  function captureYearScroll() {
    const wrap = yearTableScrollRef.current?.querySelector(".ops-tablewrap");
    if (wrap instanceof HTMLElement) {
      yearScrollTopRef.current = wrap.scrollTop;
    }
  }

  function restoreYearScroll() {
    requestAnimationFrame(() => {
      const wrap = yearTableScrollRef.current?.querySelector(".ops-tablewrap");
      if (wrap instanceof HTMLElement) {
        wrap.scrollTop = yearScrollTopRef.current;
      }
    });
  }

  function showNotice(message: string) {
    setActionNotice(message);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setActionNotice(null), 4000);
  }

  function flashRow(rowId: string) {
    setHighlightRowId(rowId);
    window.setTimeout(() => setHighlightRowId(null), 3000);
  }

  function prependActivity(entry: OpsActivityRow) {
    setRecentActivity((prev) => [entry, ...prev.filter((r) => r.id !== entry.id)].slice(0, 25));
  }

  function patchRowFromOverride(
    o: OpsMatchOverride,
    meta?: { vdjYear?: number | null },
  ) {
    setYearMatch((rows) =>
      rows.map((r) => {
        if (r.chartItemId !== o.chartItemId) return r;
        const next = applyOverride(r, o);
        if (meta && "vdjYear" in meta) {
          return { ...next, vdjYear: meta.vdjYear ?? null };
        }
        return next;
      }),
    );
  }

  function finishMatchAction(
    o: OpsMatchOverride,
    action: string,
    meta?: { vdjYear?: number | null },
  ) {
    captureYearScroll();
    patchRowFromOverride(o, meta);
    const rowId =
      yearMatch.find((r) => r.chartItemId === o.chartItemId)?.id ??
      `ym-${props.year}-${o.graphTrackId}`;
    setReviewRow(null);
    showNotice(noticeForOverride(o));
    prependActivity(activityFromOverride(o, action));
    flashRow(rowId);
    restoreYearScroll();
  }

  function openChartFromActivity(chartItemId: string) {
    const row = yearMatch.find((r) => r.chartItemId === chartItemId);
    document.getElementById("ops-year-match")?.scrollIntoView({ block: "start" });
    if (row) {
      captureYearScroll();
      setReviewRow(row);
      flashRow(row.id);
      restoreYearScroll();
    }
  }

  async function addToAcquisition(row: YearMatchRow) {
    setBusyId(row.id);
    try {
      const res = await fetch("/api/ops/acquisition", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chartItemId: row.chartItemId,
          graphTrackId: row.graphTrackId,
          artist: row.artist,
          title: row.title,
          year: row.year,
          peak: row.peak,
          status: "queued",
        }),
      });
      const data = (await res.json()) as { ok?: boolean; record?: Parameters<typeof recordToAcquisitionRow>[0] };
      if (data.ok && data.record) {
        const acqRow = recordToAcquisitionRow(data.record);
        setAcquisition((list) => {
          const next = list.filter((a) => a.chartItemId !== row.chartItemId);
          return [acqRow, ...next];
        });
        captureYearScroll();
        showNotice("Acquisition added");
        flashRow(row.id);
        restoreYearScroll();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function updateAcquisitionStatus(
    row: AcquisitionRow,
    status: AcquisitionRow["acquisitionStatus"],
  ) {
    setBusyId(row.id);
    try {
      const res = await fetch("/api/ops/acquisition", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chartItemId: row.chartItemId,
          artist: row.artist,
          title: row.title,
          year: row.year,
          peak: row.peak,
          status,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; record?: Parameters<typeof recordToAcquisitionRow>[0] };
      if (data.ok && data.record) {
        const acqRow = recordToAcquisitionRow(data.record);
        setAcquisition((list) =>
          list.map((a) => (a.chartItemId === row.chartItemId ? acqRow : a)),
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="ops-grid">
      <OpsQueuePanel
        id="ops-year-match"
        title={`Year Match Console · ${props.year}`}
        subtitle="Billboard chart universe vs VDJ owned playable media"
        count={filteredRows.length}
        tone={stats.missing ? "warn" : "ok"}
      >
        <p className="ops-stats">
          <span>
            Chart rows <strong>{stats.chartRows}</strong>
          </span>
          <span>
            Matched <strong>{stats.matched}</strong>
          </span>
          <span>
            Missing <strong>{stats.missing}</strong>
          </span>
          <span>
            Showing <strong>{filteredRows.length}</strong>
          </span>
        </p>

        <div className="ops-filters" role="toolbar" aria-label="Year match filters">
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

        {actionNotice ? (
          <p className="ops-notice" role="status">
            {actionNotice}
          </p>
        ) : null}

        <div ref={yearTableScrollRef}>
        {yearLoading ? (
          <p className="ops-empty">Loading {props.year} chart songs…</p>
        ) : yearLoadError ? (
          <p className="ops-empty">
            Year match failed: {yearLoadError}. Check Postgres and refresh.
          </p>
        ) : (
        <OpsTable
          columns={[
            { key: "rank", label: "Rank", align: "right" },
            { key: "artist", label: "Artist" },
            { key: "title", label: "Title" },
            { key: "source", label: "Chart Source" },
            { key: "peak", label: "Peak", align: "right" },
            { key: "weeks", label: "Weeks", align: "right" },
            { key: "score", label: "Importance", align: "right" },
            { key: "status", label: "Match Status" },
            { key: "best", label: "Best Match" },
            { key: "conf", label: "Confidence" },
            { key: "actions", label: "Actions" },
          ]}
          rows={filteredRows.map((row) => {
            const tone = toneForMatch(row.matchStatus);
            const disabled = busyId === row.id;
            return {
              id: row.id,
              tone,
              className: highlightRowId === row.id ? "ops-tr--highlight" : undefined,
              cells: {
                rank: row.displayRank ?? "—",
                artist: <span className="ops-strong">{row.artist}</span>,
                title: (
                  <span>
                    {row.title}
                    {row.rvtr ? (
                      <span className="ops-dim ops-mono"> · {row.rvtr}</span>
                    ) : null}
                    {row.manualOverride ? (
                      <span className="ops-dim"> · manual</span>
                    ) : null}
                  </span>
                ),
                source: row.chartSource,
                peak: row.peak ?? "—",
                weeks: row.weeks,
                score: row.importanceScore,
                status: (
                  <OpsPill tone={tone}>{matchLabel(row.matchStatus)}</OpsPill>
                ),
                best: (
                  <span className="ops-wrap ops-dim">
                    {row.bestMatch || (row.hasVdjMedia ? "VDJ library" : "—")}
                  </span>
                ),
                conf: (
                  <OpsPill tone={toneForConfidence(row.confidence)}>
                    {row.confidence.toUpperCase()}
                  </OpsPill>
                ),
                actions: (
                  <div className="ops-actions">
                    <button
                      type="button"
                      className="ops-btn ops-btn--info"
                      disabled={disabled}
                      onClick={() => setReviewRow(row)}
                    >
                      Review Match
                    </button>
                    <button
                      type="button"
                      className="ops-btn ops-btn--ok"
                      disabled={disabled}
                      onClick={() => setReviewRow(row)}
                    >
                      Select VDJ Match
                    </button>
                    <OpsInlineLink
                      href={youtubeSearchUrl(row.artist, row.title, row.year)}
                      external
                    >
                      YouTube →
                    </OpsInlineLink>
                    <button
                      type="button"
                      className="ops-btn ops-btn--warn"
                      disabled={disabled}
                      onClick={() => void addToAcquisition(row)}
                    >
                      Add To Acquisition
                    </button>
                    <button
                      type="button"
                      className="ops-btn ops-btn--info"
                      disabled={disabled}
                      onClick={async () => {
                        setBusyId(row.id);
                        try {
                          const res = await fetch("/api/ops/match", {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({
                              chartItemId: row.chartItemId,
                              graphTrackId: row.graphTrackId,
                              action: "ignore",
                            }),
                          });
                          const data = (await res.json()) as {
                            ok?: boolean;
                            override?: OpsMatchOverride;
                          };
                          if (data.ok && data.override) {
                            finishMatchAction(data.override, "ignore");
                          }
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      Ignore
                    </button>
                  </div>
                ),
              },
            };
          })}
          empty="No rows for this filter."
        />
        )}
        </div>
      </OpsQueuePanel>

      <OpsQueuePanel
        id="ops-acquisition"
        title="Acquisition Queue"
        subtitle="Persisted acquisition list (Softorino manual workflow)"
        count={acquisition.length}
        tone={acquisition.length ? "bad" : "ok"}
      >
        <OpsTable
          columns={[
            { key: "artist", label: "Artist" },
            { key: "title", label: "Title" },
            { key: "year", label: "Year", align: "right" },
            { key: "priority", label: "Priority" },
            { key: "status", label: "Acquisition" },
            { key: "actions", label: "Actions" },
          ]}
          rows={acquisition.map((row) => ({
            id: row.id,
            tone: toneForPriority(row.priority),
            cells: {
              artist: <span className="ops-strong">{row.artist}</span>,
              title: (
                <span>
                  {row.title}
                  {row.peak != null ? (
                    <span className="ops-dim"> · peak #{row.peak}</span>
                  ) : null}
                </span>
              ),
              year: row.year,
              priority: (
                <OpsPill tone={toneForPriority(row.priority)}>
                  {row.priority.toUpperCase()}
                </OpsPill>
              ),
              status: (
                <OpsPill tone="warn">{row.acquisitionStatus.toUpperCase()}</OpsPill>
              ),
              actions: (
                <div className="ops-actions">
                  <OpsInlineLink
                    href={youtubeSearchUrl(row.artist, row.title, row.year)}
                    external
                  >
                    YouTube →
                  </OpsInlineLink>
                  <button
                    type="button"
                    className="ops-btn ops-btn--info"
                    disabled={busyId === row.id}
                    onClick={() => void updateAcquisitionStatus(row, "downloaded")}
                  >
                    Mark downloaded
                  </button>
                  <button
                    type="button"
                    className="ops-btn ops-btn--warn"
                    disabled={busyId === row.id}
                    onClick={() => void updateAcquisitionStatus(row, "skipped")}
                  >
                    Mark skip
                  </button>
                  <button
                    type="button"
                    className="ops-btn ops-btn--info"
                    disabled={busyId === row.id}
                    onClick={() => void updateAcquisitionStatus(row, "unavailable")}
                  >
                    Unavailable
                  </button>
                </div>
              ),
            },
          }))}
          empty="No items in acquisition queue. Use Add To Acquisition on chart rows."
        />
      </OpsQueuePanel>

      <OpsQueuePanel
        id="ops-weekly-refresh"
        title="Weekly Refresh Status"
        subtitle="VDJ VIDEO inventory → Retroverse / R2 distribution state"
        tone={props.weeklyRefresh.lastRefreshResult === "warn" ? "warn" : "ok"}
      >
        <dl className="ops-kv">
          <div>
            <dt>Last VDJ snapshot</dt>
            <dd className="ops-mono">{props.weeklyRefresh.lastVdjSnapshot || "—"}</dd>
          </div>
          <div>
            <dt>New videos (7d)</dt>
            <dd>{props.weeklyRefresh.newVideosDetected}</dd>
          </div>
          <div>
            <dt>Metadata changes</dt>
            <dd>
              {props.weeklyRefresh.metadataChanges}
              <span className="ops-dim"> (stub)</span>
            </dd>
          </div>
          <div>
            <dt>Missing R2 uploads</dt>
            <dd>{props.weeklyRefresh.missingR2Uploads}</dd>
          </div>
          <div>
            <dt>Unmatched media</dt>
            <dd>{props.weeklyRefresh.unmatchedMedia}</dd>
          </div>
          <div className="ops-kv__wide">
            <dt>Last refresh result</dt>
            <dd>
              <OpsPill
                tone={
                  props.weeklyRefresh.lastRefreshResult === "ok"
                    ? "ok"
                    : props.weeklyRefresh.lastRefreshResult === "warn"
                      ? "warn"
                      : "info"
                }
              >
                {props.weeklyRefresh.lastRefreshResult.toUpperCase()}
              </OpsPill>
              <span className="ops-dim"> {props.weeklyRefresh.lastRefreshNote}</span>
            </dd>
          </div>
        </dl>
      </OpsQueuePanel>

      <OpsQueuePanel
        id="ops-recent-activity"
        title="Recent Activity"
        subtitle="Operational memory — matches, acquisition, artwork, ingest"
        count={recentActivity.length}
        tone="info"
      >
        <OpsTable
          columns={[
            { key: "ts", label: "Timestamp" },
            { key: "entity", label: "Entity" },
            { key: "action", label: "Action" },
            { key: "source", label: "Source" },
            { key: "status", label: "Status" },
          ]}
          rows={recentActivity.map((row) => {
            const chartItemId = chartItemIdFromEntity(row.entity);
            const rval = rvalFromEntity(row.entity);
            const matchRow = chartItemId
              ? yearMatch.find((r) => r.chartItemId === chartItemId)
              : null;
            return {
              id: row.id,
              tone:
                row.status === "ok" ? "ok" : row.status === "warn" ? "warn" : "bad",
              cells: {
                ts: <span className="ops-mono">{row.ts}</span>,
                entity: chartItemId ? (
                  <span className="ops-wrap">
                    <button
                      type="button"
                      className="ops-link--button"
                      onClick={() => openChartFromActivity(chartItemId)}
                    >
                      {row.entity}
                    </button>
                    {matchRow?.rvtr ? (
                      <>
                        {" "}
                        <OpsInlineLink href={`/track/${matchRow.rvtr}`}>
                          {matchRow.rvtr}
                        </OpsInlineLink>
                      </>
                    ) : null}
                  </span>
                ) : rval ? (
                  <span className="ops-wrap">
                    <OpsInlineLink href={`/album/${rval}`}>{row.entity}</OpsInlineLink>
                  </span>
                ) : (
                  <span className="ops-wrap">{row.entity}</span>
                ),
                action:
                  chartItemId && row.action.startsWith("match.") ? (
                    <button
                      type="button"
                      className="ops-link--button ops-mono"
                      onClick={() => openChartFromActivity(chartItemId)}
                    >
                      {row.action}
                    </button>
                  ) : (
                    <span className="ops-mono">{row.action}</span>
                  ),
                source: row.source,
                status: (
                  <OpsPill
                    tone={
                      row.status === "ok" ? "ok" : row.status === "warn" ? "warn" : "bad"
                    }
                  >
                    {row.status.toUpperCase()}
                  </OpsPill>
                ),
              },
            };
          })}
          empty="No recent activity."
        />
      </OpsQueuePanel>

      {reviewRow ? (
        <OpsReviewModal
          row={reviewRow}
          onClose={() => {
            captureYearScroll();
            setReviewRow(null);
            restoreYearScroll();
          }}
          onSaved={(override, action, meta) => {
            finishMatchAction(override, action, meta);
          }}
        />
      ) : null}
    </div>
  );
}
