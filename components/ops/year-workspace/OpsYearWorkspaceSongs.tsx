"use client";

import { YearWorkspacePanel } from "@/components/ops/year-workspace/YearWorkspacePanel";
import type {
  YearWorkspaceCompletion,
  YearWorkspaceData,
  YearWorkspaceRow,
  YearWorkspaceWorkflowAction,
} from "@/lib/ops/year-workspace/types";
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
        {props.year} Songs · Chart reconciliation
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

export function OpsYearWorkspaceSongs(props: {
  year: number;
  workspace: YearWorkspaceData;
  vocabulary: YearWorkspaceKeyword[];
  busyKey: string | null;
  onRowClick: (row: YearWorkspaceRow) => void;
  onChartAction: (row: YearWorkspaceRow, action: YearWorkspaceWorkflowAction) => void;
}) {
  return (
    <>
      <YearCompletion year={props.year} c={props.workspace.completion} />
      <div className="ops-yw-panels">
        <YearWorkspacePanel
          id="yw-in-both"
          title="In Both"
          subtitle="Billboard Hot 100 + VDJ performance video for this year"
          rows={props.workspace.inBoth}
          busyKey={props.busyKey}
          onRowClick={props.onRowClick}
        />
        <YearWorkspacePanel
          id="yw-chart-only"
          title="Chart Only"
          subtitle="On the Billboard year chart but not in the VDJ performance universe"
          rows={props.workspace.chartOnly}
          showWorkflowActions
          busyKey={props.busyKey}
          onRowClick={props.onRowClick}
          onChartAction={props.onChartAction}
        />
        <YearWorkspacePanel
          id="yw-vdj-only"
          title="VDJ Only"
          subtitle="Performance video exists but not matched to this year's Billboard chart"
          rows={props.workspace.vdjOnly}
          busyKey={props.busyKey}
          onRowClick={props.onRowClick}
        />
        <YearWorkspacePanel
          id="yw-review"
          title="Review"
          subtitle="Needs tagging, acquisition, or verification"
          rows={props.workspace.review}
          showReviewReason
          busyKey={props.busyKey}
          onRowClick={props.onRowClick}
        />
      </div>
    </>
  );
}

export function OpsYearWorkspaceSongDetailModal(props: {
  detailRow: YearWorkspaceRow;
  vocabulary: YearWorkspaceKeyword[];
  draftKeywords: YearWorkspaceKeyword[];
  saving: boolean;
  onClose: () => void;
  onToggleKeyword: (keyword: YearWorkspaceKeyword) => void;
  onSave: () => void;
}) {
  const { detailRow } = props;
  return (
    <div
      className="ops-modal-backdrop"
      role="presentation"
      onClick={props.onClose}
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
            onClick={props.onClose}
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
            {props.vocabulary.map((keyword) => {
              const on = props.draftKeywords.includes(keyword);
              return (
                <button
                  key={keyword}
                  type="button"
                  className={`ops-yw-keyword-toggle${on ? " ops-yw-keyword-toggle--on" : ""}`}
                  onClick={() => props.onToggleKeyword(keyword)}
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
            disabled={props.saving}
            onClick={props.onSave}
          >
            {props.saving ? "Saving…" : "Save keywords"}
          </button>
        </footer>
      </div>
    </div>
  );
}
