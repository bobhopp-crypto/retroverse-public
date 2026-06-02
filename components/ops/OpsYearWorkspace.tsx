"use client";

import { useCallback, useEffect, useState } from "react";

import { YearWorkspacePanel } from "@/components/ops/year-workspace/YearWorkspacePanel";
import type {
  YearWorkspaceCompletion,
  YearWorkspaceData,
  YearWorkspaceRow,
  YearWorkspaceWorkflowAction,
} from "@/lib/ops/year-workspace/types";
import { YEAR_WORKSPACE_CATEGORIES } from "@/lib/ops/year-workspace/types";
import type { YearWorkspaceKeyword } from "@/lib/ops/year-workspace/vocabulary";

function CompletionBar(props: {
  label: string;
  value: number;
  max: number;
  tone?: "ok" | "warn" | "info";
}) {
  const pct = props.max > 0 ? Math.round((props.value / props.max) * 100) : 0;
  return (
    <div className="ops-yw-completion__row">
      <div className="ops-yw-completion__label">
        <span>{props.label}</span>
        <span className="ops-yw-completion__nums">
          <strong>{props.value}</strong>
          <span className="ops-dim"> / {props.max}</span>
        </span>
      </div>
      <div className="ops-yw-completion__track" role="presentation">
        <div
          className={`ops-yw-completion__fill ops-yw-completion__fill--${props.tone ?? "info"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function YearCompletion(props: { year: number; c: YearWorkspaceCompletion }) {
  const { c } = props;
  return (
    <section className="ops-yw-completion" aria-labelledby="ops-yw-completion-heading">
      <h2 id="ops-yw-completion-heading" className="ops-yw-completion__title">
        {props.year} Completion
      </h2>
      <CompletionBar label="Billboard songs" value={c.billboardTotal} max={c.billboardTotal} />
      <CompletionBar label="Matched" value={c.matched} max={c.billboardTotal} tone="info" />
      <CompletionBar label="In Both" value={c.inBoth} max={c.billboardTotal} tone="ok" />
      <CompletionBar label="Missing" value={c.missing} max={c.billboardTotal} tone="warn" />
      <CompletionBar
        label="Reviewed"
        value={c.reviewed}
        max={Math.max(c.reviewed + c.chartOnlyPending, 1)}
      />
      <CompletionBar label="Tagged" value={c.tagged} max={c.billboardTotal} tone="ok" />
      <p className="ops-dim ops-yw-completion__queue">
        Review queue: <strong>{c.reviewQueue}</strong>
        {c.chartOnlyPending > 0 ? (
          <>
            {" "}
            · Chart-only pending action: <strong>{c.chartOnlyPending}</strong>
          </>
        ) : null}
      </p>
    </section>
  );
}

export function OpsYearWorkspace(props: { year: number }) {
  const [workspace, setWorkspace] = useState<YearWorkspaceData | null>(null);
  const [vocabulary, setVocabulary] = useState<YearWorkspaceKeyword[]>([]);
  const [category, setCategory] = useState<string>("songs");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<YearWorkspaceRow | null>(null);
  const [draftKeywords, setDraftKeywords] = useState<YearWorkspaceKeyword[]>([]);
  const [saving, setSaving] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
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

  async function patchWorkspace(body: Record<string, unknown>) {
    const res = await fetch("/api/ops/year-workspace", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ year: props.year, ...body }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      workspace?: YearWorkspaceData;
      error?: string;
    };
    if (!res.ok || !data.ok || !data.workspace) {
      throw new Error(data.error ?? "Save failed");
    }
    setWorkspace(data.workspace);
    return data.workspace;
  }

  async function saveKeywords() {
    if (!detailRow) return;
    setSaving(true);
    setNotice(null);
    try {
      await patchWorkspace({
        workspaceKey: detailRow.workspaceKey,
        keywords: draftKeywords,
      });
      setNotice("Keywords saved");
      setDetailRow(null);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveChartAction(
    row: YearWorkspaceRow,
    action: YearWorkspaceWorkflowAction,
  ) {
    setBusyKey(row.workspaceKey);
    setNotice(null);
    try {
      await patchWorkspace({
        workspaceKey: row.workspaceKey,
        chartAction: action,
      });
      setNotice(`${row.title}: ${action}`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyKey(null);
    }
  }

  const completion = workspace?.completion;

  return (
    <div className="ops-yw">
      <header className="ops-yw__head">
        <div>
          <p className="ops-yw__kicker">Collection · acquisition · event prep</p>
          <h2 className="ops-yw__title">What you have · what you need · what to do next</h2>
        </div>
        <button type="button" className="ops-btn ops-btn--info" onClick={() => void load()}>
          Refresh
        </button>
      </header>

      {completion ? <YearCompletion year={props.year} c={completion} /> : null}

      <nav className="ops-yw-categories" aria-label="Year workspace categories">
        {YEAR_WORKSPACE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`ops-yw-category${category === cat.id ? " ops-yw-category--on" : ""}${
              !cat.active ? " ops-yw-category--soon" : ""
            }`}
            onClick={() => setCategory(cat.id)}
          >
            {cat.label}
            {!cat.active ? <span className="ops-yw-category__badge">Soon</span> : null}
          </button>
        ))}
      </nav>

      {notice ? (
        <p className="ops-notice" role="status">
          {notice}
        </p>
      ) : null}

      {loading ? (
        <p className="ops-empty">Loading {props.year} workspace…</p>
      ) : error ? (
        <p className="ops-empty">{error}</p>
      ) : category !== "songs" ? (
        <p className="ops-empty ops-yw-coming-soon">Coming Soon</p>
      ) : workspace ? (
        <div className="ops-yw-panels">
          <YearWorkspacePanel
            id="yw-in-both"
            title="In Both"
            subtitle="Billboard Hot 100 + VDJ performance video for this year"
            rows={workspace.inBoth}
            busyKey={busyKey}
            onRowClick={openDetail}
          />
          <YearWorkspacePanel
            id="yw-chart-only"
            title="Chart Only"
            subtitle="On the Billboard year chart but not in the VDJ performance universe"
            rows={workspace.chartOnly}
            showWorkflowActions
            busyKey={busyKey}
            onRowClick={openDetail}
            onChartAction={(row, action) => void saveChartAction(row, action)}
          />
          <YearWorkspacePanel
            id="yw-vdj-only"
            title="VDJ Only"
            subtitle="Performance video exists but not matched to this year's Billboard chart"
            rows={workspace.vdjOnly}
            busyKey={busyKey}
            onRowClick={openDetail}
          />
          <YearWorkspacePanel
            id="yw-review"
            title="Review"
            subtitle="Needs tagging, acquisition, or verification"
            rows={workspace.review}
            showReviewReason
            busyKey={busyKey}
            onRowClick={openDetail}
          />
        </div>
      ) : null}

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
              {detailRow.reviewReason ? (
                <div>
                  <dt>Review</dt>
                  <dd>{detailRow.reviewReason}</dd>
                </div>
              ) : null}
              <div>
                <dt>Peak / Weeks</dt>
                <dd>
                  {detailRow.peak ?? "—"} / {detailRow.weeks ?? "—"}
                </dd>
              </div>
              {detailRow.workflowAction ? (
                <div>
                  <dt>Workflow</dt>
                  <dd>{detailRow.workflowAction}</dd>
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
    </div>
  );
}
