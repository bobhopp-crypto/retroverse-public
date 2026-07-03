"use client";

import Link from "next/link";
import { useState } from "react";

import type { BrowserPlusModel } from "@/lib/ops/browser-plus/types";

type Props = {
  model: BrowserPlusModel;
};

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="browser-plus-coverage__metric">
      <p className="browser-plus-coverage__metric-label">{label}</p>
      <p className="browser-plus-coverage__metric-value">{value}</p>
      {hint ? <p className="browser-plus-coverage__metric-hint">{hint}</p> : null}
    </div>
  );
}

export function BrowserPlusCoverageDashboard({ model }: Props) {
  const [expanded, setExpanded] = useState(false);
  const coverage = model.collectionCoverage;
  const video = model.stats.videoCoverage;
  const chart = model.chartCoverage;

  if (!coverage) return null;

  const { library, byYear, byArtist } = coverage;

  return (
    <section className="browser-plus-coverage" aria-label="Collection coverage">
      <div className="browser-plus-coverage__head">
        <div>
          <p className="browser-plus-coverage__kicker">Phase 5 · Collection Manager</p>
          <h2 className="browser-plus-coverage__title">Coverage Dashboard</h2>
        </div>
        <button
          type="button"
          className="browser-plus-coverage__toggle"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Hide breakdown" : "Year & artist breakdown"}
        </button>
      </div>

      <div className="browser-plus-coverage__grid">
        <MetricCard
          label="Owned Videos"
          value={formatNumber(video.matched)}
          hint={`${formatNumber(video.total)} VIDEO files · ${video.coveragePct}% RVTR matched`}
        />
        <MetricCard
          label="Hot 100 Owned"
          value={formatNumber(chart?.videoHot100Count ?? library.owned)}
          hint={`${library.coveragePct}% of ${formatNumber(library.total)} chart songs`}
        />
        <MetricCard
          label="YouTube Available"
          value={formatNumber(library.youtube)}
          hint="Chart songs with YouTube, no owned VIDEO"
        />
        <MetricCard
          label="Missing"
          value={formatNumber(chart?.gapCount ?? library.missing)}
          hint="Chart songs without owned VIDEO"
        />
      </div>

      {expanded ? (
        <div className="browser-plus-coverage__panels">
          <div className="browser-plus-coverage__panel">
            <h3>By year</h3>
            <div className="browser-plus-coverage__table-wrap">
              <table className="browser-plus-coverage__table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Owned</th>
                    <th>YouTube</th>
                    <th>Missing</th>
                    <th>Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {byYear.slice(0, 24).map((row) => (
                    <tr key={row.year}>
                      <td>{row.year}</td>
                      <td>{row.owned}</td>
                      <td>{row.youtube}</td>
                      <td>{row.missing}</td>
                      <td>{row.coveragePct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="browser-plus-coverage__panel">
            <h3>By artist (most missing)</h3>
            <div className="browser-plus-coverage__table-wrap">
              <table className="browser-plus-coverage__table">
                <thead>
                  <tr>
                    <th>Artist</th>
                    <th>Owned</th>
                    <th>YouTube</th>
                    <th>Missing</th>
                    <th>Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {byArtist.slice(0, 20).map((row) => (
                    <tr key={row.slug}>
                      <td>
                        <Link href={`/artist/${row.slug}/songs`} className="browser-plus-coverage__artist-link">
                          {row.artistName}
                        </Link>
                      </td>
                      <td>{row.owned}</td>
                      <td>{row.youtube}</td>
                      <td>{row.missing}</td>
                      <td>{row.coveragePct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
