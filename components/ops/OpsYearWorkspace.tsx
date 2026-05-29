"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { OpsPill, OpsTable } from "@/components/ops/OpsTable";
import type { YearWorkspaceData, YearWorkspaceRow } from "@/lib/ops/year-workspace/types";
import type { YearWorkspaceKeyword } from "@/lib/ops/year-workspace/vocabulary";
import type { MatchStatus } from "@/lib/ops/reconciliation-model";

type TabId = "in_both" | "chart_only" | "vdj_only";

const TABS: { id: TabId; label: string }[] = [
  { id: "in_both", label: "In Both" },
  { id: "chart_only", label: "Chart Only" },
  { id: "vdj_only", label: "VDJ Only" },
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

function KeywordChips(props: {
  keywords: YearWorkspaceKeyword[];
  compact?: boolean;
}) {
  if (props.keywords.length === 0) {
    return <span className="ops-dim">—</span>;
  }
  return (
    <span className={`ops-yw-keywords${props.compact ? " ops-yw-keywords--compact" : ""}`}>
      {props.keywords.map((k) => (
        <span key={k} className="ops-yw-keyword">
          {k}
        </span>
      ))}
    </span>
  );
}

export function OpsYearWorkspace(props: { year: number }) {
  const [workspace, setWorkspace] = useState<YearWorkspaceData | null>(null);
  const [vocabulary, setVocabulary] = useState<YearWorkspaceKeyword[]>([]);
  const [tab, setTab] = useState<TabId>("in_both");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<YearWorkspaceRow | null>(null);
  const [draftKeywords, setDraftKeywords] = useState<YearWorkspaceKeyword[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ops/year-workspace?year=${props.year}`);
      const data = (await res.json()) as {
        ok?: boolean;
        workspace?: YearWorkspaceData;
        vocabulary?: YearWorkspaceKeyword[];
        error?: string;
      };
      if (!res.ok || !data.ok || !data.workspace) {
        setError(data.error ?? `Load failed (${res.status})`);
        return;
      }
      setWorkspace(data.workspace);
      setVocabulary(data.vocabulary ?? []);
    } catch {
      setError("Failed to load year workspace");
    } finally {
      setLoading(false);
    }
  }, [props.year]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeRows = useMemo(() => {
    if (!workspace) return [];
    if (tab === "in_both") return workspace.inBoth;
    if (tab === "chart_only") return workspace.chartOnly;
    return workspace.vdjOnly;
  }, [workspace, tab]);

  function openDetail(row: YearWorkspaceRow) {
    setDetailRow(row);
    setDraftKeywords([...row.keywords]);
    setNotice(null);
  }

  function toggleKeyword(keyword: YearWorkspaceKeyword) {
    setDraftKeywords((list) =>
      list.includes(keyword) ? list.filter((k) => k !== keyword) : [...list, keyword],
    );
  }

  async function saveKeywords() {
    if (!detailRow) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/ops/year-workspace", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          year: props.year,
          workspaceKey: detailRow.workspaceKey,
          keywords: draftKeywords,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        workspace?: YearWorkspaceData;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.workspace) {
        setNotice(data.error ?? "Save failed");
        return;
      }
      setWorkspace(data.workspace);
      setNotice("Keywords saved");
      setDetailRow(null);
    } catch {
      setNotice("Save failed");
    } finally {
      setSaving(false);
    }
  }

  const stats = workspace?.stats;

  return (
    <section className="ops-yw" aria-labelledby="ops-yw-heading">
      <header className="ops-yw__head">
        <div>
          <h2 id="ops-yw-heading" className="ops-yw__title">
            Year Workspace · {props.year}
          </h2>
          <p className="ops-dim ops-yw__subtitle">
            Event prep — Billboard Hot 100 vs VirtualDJ performance library (VDJ year is
            authoritative for performance universe).
          </p>
        </div>
        <button type="button" className="ops-btn ops-btn--info" onClick={() => void load()}>
          Refresh
        </button>
      </header>

      {stats ? (
        <div className="ops-yw-stats" role="status">
          <span>
            Billboard <strong>{stats.billboardTotal}</strong>
          </span>
          <span>
            VDJ <strong>{stats.vdjTotal}</strong>
          </span>
          <span>
            In Both <strong>{stats.inBoth}</strong>
          </span>
          <span>
            Chart Only <strong>{stats.chartOnly}</strong>
          </span>
          <span>
            VDJ Only <strong>{stats.vdjOnly}</strong>
          </span>
        </div>
      ) : null}

      <div className="ops-filters" role="tablist" aria-label="Year workspace buckets">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`ops-filter${tab === t.id ? " ops-filter--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {stats ? (
              <span className="ops-yw-tab-count">
                {t.id === "in_both"
                  ? stats.inBoth
                  : t.id === "chart_only"
                    ? stats.chartOnly
                    : stats.vdjOnly}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {notice ? (
        <p className="ops-notice" role="status">
          {notice}
        </p>
      ) : null}

      {loading ? (
        <p className="ops-empty">Loading {props.year} workspace…</p>
      ) : error ? (
        <p className="ops-empty">{error}</p>
      ) : (
        <OpsTable
          columns={[
            { key: "artist", label: "Artist" },
            { key: "title", label: "Title" },
            { key: "peak", label: "Peak", align: "right" },
            { key: "weeks", label: "Weeks", align: "right" },
            { key: "status", label: "Match" },
            { key: "keywords", label: "Keywords" },
          ]}
          rows={activeRows.map((row) => ({
            id: row.id,
            tone: toneForMatch(row.matchStatus),
            onClick: () => openDetail(row),
            cells: {
              artist: <span className="ops-strong">{row.artist}</span>,
              title: row.title,
              peak: row.peak ?? "—",
              weeks: row.weeks ?? "—",
              status: (
                <OpsPill tone={toneForMatch(row.matchStatus)}>
                  {matchLabel(row.matchStatus)}
                </OpsPill>
              ),
              keywords: <KeywordChips keywords={row.keywords} compact />,
            },
          }))}
        />
      )}

      {detailRow ? (
        <div
          className="ops-modal-backdrop"
          role="presentation"
          onClick={() => setDetailRow(null)}
        >
          <div
            className="ops-modal ops-yw-modal"
            role="dialog"
            aria-labelledby="ops-yw-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="ops-modal__header">
              <div>
                <p className="ops-modal__kicker">Why would you play this?</p>
                <h3 id="ops-yw-detail-title" className="ops-modal__title">
                  {detailRow.artist} — {detailRow.title}
                </h3>
              </div>
              <button
                type="button"
                className="ops-modal__close"
                aria-label="Close"
                onClick={() => setDetailRow(null)}
              >
                ×
              </button>
            </header>

            <dl className="ops-yw-detail-facts">
              <div>
                <dt>Bucket</dt>
                <dd>{detailRow.bucket.replaceAll("_", " ")}</dd>
              </div>
              <div>
                <dt>Peak / Weeks</dt>
                <dd>
                  {detailRow.peak ?? "—"} / {detailRow.weeks ?? "—"}
                </dd>
              </div>
              <div>
                <dt>Match</dt>
                <dd>{matchLabel(detailRow.matchStatus)}</dd>
              </div>
              {detailRow.rvtr ? (
                <div>
                  <dt>RVTR</dt>
                  <dd>{detailRow.rvtr}</dd>
                </div>
              ) : null}
              {detailRow.vdjLabel ? (
                <div>
                  <dt>VDJ</dt>
                  <dd>{detailRow.vdjLabel}</dd>
                </div>
              ) : null}
              {detailRow.sourcePath ? (
                <div>
                  <dt>Path</dt>
                  <dd className="ops-mono">{detailRow.sourcePath}</dd>
                </div>
              ) : null}
            </dl>

            <div className="ops-yw-keyword-picker">
              <p className="ops-yw-keyword-picker__label">Keywords</p>
              <div className="ops-yw-keyword-picker__grid">
                {vocabulary.map((keyword) => {
                  const on = draftKeywords.includes(keyword);
                  return (
                    <button
                      key={keyword}
                      type="button"
                      className={`ops-yw-keyword-toggle${on ? " ops-yw-keyword-toggle--on" : ""}`}
                      onClick={() => toggleKeyword(keyword)}
                    >
                      {keyword}
                    </button>
                  );
                })}
              </div>
            </div>

            <footer className="ops-modal__actions">
              <button
                type="button"
                className="ops-btn ops-btn--ok"
                disabled={saving}
                onClick={() => void saveKeywords()}
              >
                {saving ? "Saving…" : "Save keywords"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
}
