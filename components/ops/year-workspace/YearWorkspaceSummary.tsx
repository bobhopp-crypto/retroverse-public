"use client";

import type {
  ShowReadinessSummary,
  YearWorkspaceProductionSummary,
} from "@/lib/ops/year-workspace/production-types";
import { YEAR_WORKSPACE_CATEGORIES } from "@/lib/ops/year-workspace/types";

export function YearWorkspaceSummary(props: {
  year: number;
  summary: YearWorkspaceProductionSummary;
  showReadiness: ShowReadinessSummary;
  activeCategory: string;
  onSelectCategory: (id: string) => void;
}) {
  const { showReadiness } = props;

  return (
    <section className="ops-yw-summary" aria-labelledby="ops-yw-summary-heading">
      <div className="ops-yw-summary__top">
        <h2 id="ops-yw-summary-heading" className="ops-yw-summary__title">
          Workspace Summary
        </h2>
        <div className="ops-yw-readiness" aria-label="Show readiness">
          <span className="ops-yw-readiness__label">
            {props.year} Show Readiness
          </span>
          <span className="ops-yw-readiness__pct">{showReadiness.percent}%</span>
          <span className="ops-dim ops-yw-readiness__sub">
            {showReadiness.approvedAssets} approved / {showReadiness.targetAssets} target
          </span>
        </div>
      </div>
      <div className="ops-yw-summary__grid">
        {YEAR_WORKSPACE_CATEGORIES.map((cat) => {
          const counts = props.summary[cat.id];
          const on = props.activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              className={`ops-yw-summary__card${on ? " ops-yw-summary__card--on" : ""}`}
              onClick={() => props.onSelectCategory(cat.id)}
            >
              <span className="ops-yw-summary__card-label">{cat.label}</span>
              <span className="ops-yw-summary__counts">
                <span>
                  <em>W</em> {counts.wanted}
                </span>
                <span>
                  <em>Q</em> {counts.queued}
                </span>
                <span>
                  <em>Aq</em> {counts.acquired}
                </span>
                <span>
                  <em>Ap</em> {counts.approved}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="ops-dim ops-yw-summary__legend">
        W = Wanted · Q = Queued · Aq = Acquired · Ap = Approved. Songs use Billboard
        reconciliation for W/Aq/Ap.
      </p>
    </section>
  );
}
