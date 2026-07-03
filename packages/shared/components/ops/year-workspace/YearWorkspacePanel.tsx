"use client";

import { useState } from "react";

import { OpsPill, OpsTable } from "@/components/ops/OpsTable";
import type { YearWorkspaceRow, YearWorkspaceWorkflowAction } from "@/lib/ops/year-workspace/types";
import { YEAR_WORKSPACE_PANEL_PREVIEW } from "@/lib/ops/year-workspace/types";
import type { YearWorkspaceKeyword } from "@/lib/ops/year-workspace/vocabulary";
import type { MatchStatus } from "@/lib/ops/reconciliation-model";

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

function KeywordChips(props: { keywords: YearWorkspaceKeyword[] }) {
  if (props.keywords.length === 0) {
    return <span className="ops-dim">—</span>;
  }
  return (
    <span className="ops-yw-keywords ops-yw-keywords--compact">
      {props.keywords.map((k) => (
        <span key={k} className="ops-yw-keyword">
          {k}
        </span>
      ))}
    </span>
  );
}

function workflowLabel(action: YearWorkspaceWorkflowAction | null) {
  if (!action) return null;
  return action.toUpperCase();
}

export function YearWorkspacePanel(props: {
  id: string;
  title: string;
  subtitle: string;
  rows: YearWorkspaceRow[];
  showWorkflowActions?: boolean;
  showReviewReason?: boolean;
  busyKey: string | null;
  onRowClick: (row: YearWorkspaceRow) => void;
  onChartAction?: (
    row: YearWorkspaceRow,
    action: YearWorkspaceWorkflowAction,
  ) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const total = props.rows.length;
  const visible = expanded
    ? props.rows
    : props.rows.slice(0, YEAR_WORKSPACE_PANEL_PREVIEW);
  const hidden = total - YEAR_WORKSPACE_PANEL_PREVIEW;

  return (
    <section className="ops-yw-panel" aria-labelledby={props.id}>
      <header className="ops-yw-panel__head">
        <div>
          <h3 id={props.id} className="ops-yw-panel__title">
            {props.title}
            <span className="ops-yw-panel__count">{total}</span>
          </h3>
          <p className="ops-dim ops-yw-panel__subtitle">{props.subtitle}</p>
        </div>
      </header>

      {total === 0 ? (
        <p className="ops-empty ops-yw-panel__empty">None in this bucket.</p>
      ) : (
        <>
          <OpsTable
            columns={[
              { key: "artist", label: "Artist" },
              { key: "title", label: "Title" },
              { key: "peak", label: "Peak", align: "right" },
              ...(props.showReviewReason
                ? [{ key: "reason", label: "Why" } as const]
                : []),
              { key: "status", label: "Match" },
              { key: "keywords", label: "Keywords" },
              ...(props.showWorkflowActions
                ? [{ key: "actions", label: "Actions" } as const]
                : []),
            ]}
            rows={visible.map((row) => ({
              id: row.id,
              tone: toneForMatch(row.matchStatus),
              onClick: props.showWorkflowActions ? undefined : () => props.onRowClick(row),
              cells: {
                artist: <span className="ops-strong">{row.artist}</span>,
                title: row.title,
                peak: row.peak ?? "—",
                ...(props.showReviewReason
                  ? { reason: row.reviewReason ?? "—" }
                  : {}),
                status: (
                  <OpsPill tone={toneForMatch(row.matchStatus)}>
                    {props.showWorkflowActions && row.workflowAction
                      ? workflowLabel(row.workflowAction)
                      : matchLabel(row.matchStatus)}
                  </OpsPill>
                ),
                keywords: <KeywordChips keywords={row.keywords} />,
                ...(props.showWorkflowActions
                  ? {
                      actions: (
                        <span
                          className="ops-yw-actions"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          {(
                            [
                              ["acquire", "Acquire"],
                              ["skip", "Skip"],
                              ["review", "Review"],
                            ] as const
                          ).map(([action, label]) => (
                            <button
                              key={action}
                              type="button"
                              className={`ops-yw-action${
                                row.workflowAction === action ? " ops-yw-action--on" : ""
                              }`}
                              disabled={props.busyKey === row.workspaceKey}
                              onClick={() => props.onChartAction?.(row, action)}
                            >
                              {label}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="ops-yw-action ops-yw-action--detail"
                            onClick={() => props.onRowClick(row)}
                          >
                            Detail
                          </button>
                        </span>
                      ),
                    }
                  : {}),
              },
            }))}
          />

          {!expanded && hidden > 0 ? (
            <button
              type="button"
              className="ops-yw-panel__more"
              onClick={() => setExpanded(true)}
            >
              Show all {total}
            </button>
          ) : expanded && total > YEAR_WORKSPACE_PANEL_PREVIEW ? (
            <button
              type="button"
              className="ops-yw-panel__more"
              onClick={() => setExpanded(false)}
            >
              Show first {YEAR_WORKSPACE_PANEL_PREVIEW}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
