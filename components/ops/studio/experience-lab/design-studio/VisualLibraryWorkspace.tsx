"use client";

import type { VisualLibrary } from "@/lib/retroverse/visual-library/types";
import { formatBudgetUsage } from "@/lib/retroverse/visual-library/budget";
import { coverageRoleLabel } from "@/lib/retroverse/visual-library/coverage";
import { VISUAL_GENERATOR_CONTRACTS } from "@/lib/retroverse/visual-library/generators";

type Props = {
  library: VisualLibrary;
};

function statusClass(status: string): string {
  return `vl-coverage__cell vl-coverage__cell--${status}`;
}

export function VisualLibraryWorkspace({ library }: Props) {
  const { budget, coverage, performanceFrames, derivedAssets, duplicateSuggestions, recommendations } =
    library;

  const recommendedAssets = derivedAssets.filter((d) => d.status === "recommended");

  return (
    <div className="vl-workspace">
      <header className="vl-workspace__header">
        <h3 className="vl-workspace__title">Visual Library</h3>
        <p className="vl-workspace__subtitle">
          Asset management · {library.tier} tier · no package writes
        </p>
      </header>

      <section className="vl-panel vl-panel--budget" aria-label="Asset budget">
        <h4 className="vl-panel__title">Asset Budget</h4>
        <p className="vl-budget__usage">{formatBudgetUsage(budget)}</p>
        <dl className="vl-budget__stats">
          <div>
            <dt>Generated</dt>
            <dd>{budget.generatedCount}</dd>
          </div>
          <div>
            <dt>Recommended</dt>
            <dd>{budget.recommendedCount}</dd>
          </div>
          <div>
            <dt>Remaining</dt>
            <dd>{budget.remainingApproved}</dd>
          </div>
        </dl>
        {budget.atLimit ? (
          <p className="vl-budget__warn">Approved asset limit reached — prioritize quality over quantity.</p>
        ) : null}
      </section>

      <section className="vl-panel" aria-label="Coverage grid">
        <h4 className="vl-panel__title">Story Coverage</h4>
        <p className="vl-panel__hint">Judged by visual roles, not image count.</p>
        <div className="vl-coverage">
          {coverage.map((item) => (
            <div key={item.role} className={statusClass(item.status)}>
              <span className="vl-coverage__role">{coverageRoleLabel(item.role)}</span>
              <span className="vl-coverage__status">{item.status}</span>
              <span className="vl-coverage__notes">{item.notes}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="vl-panel" aria-label="Performance frames">
        <h4 className="vl-panel__title">Performance Frames ({performanceFrames.length})</h4>
        <ul className="vl-frame-list">
          {performanceFrames.map((frame) => (
            <li key={frame.id} className="vl-frame-list__item">
              <div className="vl-frame-list__thumb-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={frame.imageUrl}
                  alt={frame.category ?? frame.filename}
                  className="vl-frame-list__thumb"
                />
              </div>
              <div className="vl-frame-list__meta">
                <strong>{frame.category ?? frame.shotType}</strong>
                <span>Q{frame.qualityScore}</span>
                {frame.timestampSec != null ? <span>{frame.timestampSec}s</span> : null}
                <span>{frame.approved ? "Approved" : "Extracted"}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="vl-panel" aria-label="Derived assets">
        <h4 className="vl-panel__title">Derived Assets ({derivedAssets.length})</h4>
        {derivedAssets.length === 0 ? (
          <p className="vl-empty">No derived assets on file.</p>
        ) : (
          <ul className="vl-derived-list">
            {derivedAssets.map((asset) => (
              <li key={asset.id} className={`vl-derived-list__item vl-derived-list__item--${asset.status}`}>
                <strong>{asset.styleName}</strong>
                <span className="vl-derived-list__status">{asset.status}</span>
                <span className="vl-derived-list__source">from {asset.sourceFrameId.slice(0, 8)}…</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="vl-panel" aria-label="Recommended assets">
        <h4 className="vl-panel__title">Recommended ({recommendedAssets.length})</h4>
        {recommendations.length === 0 ? (
          <p className="vl-empty">Coverage complete — no new assets recommended.</p>
        ) : (
          <ul className="vl-rec-list">
            {recommendations.slice(0, 8).map((rec) => (
              <li key={rec.id} className="vl-rec-list__item">
                <span className="vl-rec-list__role">{coverageRoleLabel(rec.role)}</span>
                <span className="vl-rec-list__kind">{rec.kind.replace(/_/g, " ")}</span>
                <p className="vl-rec-list__reason">{rec.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="vl-panel" aria-label="Duplicate suggestions">
        <h4 className="vl-panel__title">Duplicate Suggestions ({duplicateSuggestions.length})</h4>
        {duplicateSuggestions.length === 0 ? (
          <p className="vl-empty">No near-duplicate frames detected.</p>
        ) : (
          <ul className="vl-dup-list">
            {duplicateSuggestions.map((dup) => (
              <li key={`${dup.frameAId}-${dup.frameBId}`} className="vl-dup-list__item">
                <p className="vl-dup-list__pair">
                  {dup.frameALabel} ↔ {dup.frameBLabel}
                  <strong> {dup.similarityPercent}%</strong>
                </p>
                <p className="vl-dup-list__action">
                  Keep <strong>{dup.keepFrameId.slice(0, 8)}…</strong> · Discard{" "}
                  <strong>{dup.discardFrameId.slice(0, 8)}…</strong>
                </p>
                <p className="vl-dup-list__reason">{dup.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="vl-panel" aria-label="Generation queue">
        <h4 className="vl-panel__title">Generation Queue (future)</h4>
        <p className="vl-panel__hint">
          {library.generationQueue.length} queued · {VISUAL_GENERATOR_CONTRACTS.length} generator contracts defined
        </p>
        <ul className="vl-gen-contracts">
          {VISUAL_GENERATOR_CONTRACTS.map((g) => (
            <li key={g.id}>
              <strong>{g.name}</strong> — {g.description.slice(0, 80)}…
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
