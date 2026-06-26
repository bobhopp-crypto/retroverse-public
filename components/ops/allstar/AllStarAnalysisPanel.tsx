"use client";

import Link from "next/link";
import { useMemo } from "react";

import type { AllStarDiscDetail } from "@/lib/ops/allstar/types";
import { ALLSTAR_RESULT_NUMBERS } from "@/lib/ops/allstar/types";

type Props = {
  disc: AllStarDiscDetail;
};

export function AllStarAnalysisPanel({ disc }: Props) {
  const exportPayload = useMemo(
    () => ({
      id: disc.id,
      player: disc.player,
      position: disc.position,
      scanFilename: disc.scanFilename,
      degrees: disc.degrees,
      probabilities: disc.probabilities,
      processingStatus: disc.processingStatus,
      geometryStatus: disc.geometryStatus,
      degreesSum: disc.degreesSum,
      outcomeSummary: disc.outcomeSummary,
      warnings: disc.warnings,
      exportedAt: new Date().toISOString(),
    }),
    [disc],
  );

  function exportJson() {
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${disc.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="ops-allstar__analysis">
      <div className="ops-allstar__analysis-actions">
        <Link href="/ops/allstar/library">← Disc Library</Link>
        <div className="ops-allstar__analysis-actions-right">
          <Link href={`/ops/allstar/player/${disc.id}`}>Player Intelligence →</Link>
          <button type="button" className="ops-allstar__export" onClick={exportJson}>
            Export JSON
          </button>
        </div>
      </div>

      <div className="ops-allstar__analysis-grid">
        <section className="ops-allstar__panel">
          <h2>Original Scan</h2>
          <img
            className="ops-allstar__scan"
            src={`/api/ops/allstar/image?kind=scan&id=${encodeURIComponent(disc.id)}`}
            alt={`Scan for ${disc.player || disc.id}`}
          />
        </section>

        <section className="ops-allstar__panel">
          <h2>Review Image</h2>
          {disc.hasReviewImage ? (
            <img
              className="ops-allstar__scan"
              src={`/api/ops/allstar/image?kind=review&id=${encodeURIComponent(disc.id)}`}
              alt={`Review for ${disc.player || disc.id}`}
            />
          ) : (
            <p className="ops-allstar__empty">Review image not generated yet.</p>
          )}
        </section>

        <section className="ops-allstar__panel">
          <h2>Extracted Metadata</h2>
          <dl className="ops-allstar__meta">
            <div>
              <dt>Player</dt>
              <dd>{disc.player || "—"}</dd>
            </div>
            <div>
              <dt>Position</dt>
              <dd>{disc.position || "—"}</dd>
            </div>
            <div>
              <dt>Processing</dt>
              <dd>{disc.processingStatus}</dd>
            </div>
            <div>
              <dt>Geometry</dt>
              <dd>{disc.geometryStatus}</dd>
            </div>
            <div>
              <dt>Degrees sum</dt>
              <dd>{disc.degreesSum != null ? `${disc.degreesSum.toFixed(1)}°` : "—"}</dd>
            </div>
          </dl>
          {disc.warnings.length ? (
            <ul className="ops-allstar__warnings">
              {disc.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="ops-allstar__panel ops-allstar__panel--wide">
          <h2>Probability Summary</h2>
          <div className="ops-allstar__summary-grid">
            {disc.outcomeSummary.map((item) => (
              <article key={item.key} className="ops-allstar__summary-card">
                <h3>{item.label}</h3>
                <p className="ops-allstar__summary-numbers">
                  {item.numbers.map((n) => `#${n}`).join(" + ")}
                </p>
                <p className="ops-allstar__summary-value">
                  {(item.probability * 100).toFixed(2)}%
                </p>
                <p className="ops-allstar__summary-degrees">{item.degrees.toFixed(1)}°</p>
                <div className="ops-allstar__bar-track">
                  <div
                    className="ops-allstar__bar-fill"
                    style={{ width: `${Math.min(item.probability * 100, 100)}%` }}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="ops-allstar__panel ops-allstar__panel--wide">
          <h2>Outcome Probabilities (1–14)</h2>
          <div className="ops-allstar__prob-table-wrap">
            <table className="ops-allstar__prob-table">
              <thead>
                <tr>
                  <th>Result</th>
                  <th>Degrees</th>
                  <th>Probability</th>
                  <th>Bar</th>
                </tr>
              </thead>
              <tbody>
                {ALLSTAR_RESULT_NUMBERS.map((n) => {
                  const deg = disc.degrees[n] ?? 0;
                  const prob = disc.probabilities[n] ?? 0;
                  return (
                    <tr key={n}>
                      <td>{n}</td>
                      <td>{deg.toFixed(1)}°</td>
                      <td>{(prob * 100).toFixed(2)}%</td>
                      <td>
                        <div className="ops-allstar__bar-track">
                          <div
                            className="ops-allstar__bar-fill"
                            style={{ width: `${Math.min(prob * 100, 100)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
