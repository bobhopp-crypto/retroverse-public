"use client";

import type {
  Bp2DailyProductionReport,
  Bp2PackageIntegrityReport,
} from "@/lib/ops/browser-plus-2/types";

import { formatDurationShort, queueDepartmentLabel } from "@/components/ops/browser-plus-2/studio-ops-labels";

type Props = {
  report: Bp2DailyProductionReport;
  integrity?: Bp2PackageIntegrityReport;
};

export function StudioDailyReportPanel({ report, integrity }: Props) {
  const { queueSummary } = report;

  return (
    <section className="bp2__daily-report" aria-label="Daily production report">
      <header className="bp2__daily-report-head">
        <div>
          <h2 className="bp2__daily-report-title">Daily Production Report</h2>
          <p className="bp2__daily-report-period">{report.periodLabel}</p>
        </div>
        <div className="bp2__daily-report-summary">
          <span>{report.totalProcessed24h.toLocaleString()} songs processed (24h)</span>
          {report.avgProcessingTimeMs ? (
            <span>Avg {formatDurationShort(report.avgProcessingTimeMs)} per song</span>
          ) : null}
        </div>
      </header>

      <div className="bp2__daily-report-stats" aria-label="Queue summary">
        <div className="bp2__daily-stat">
          <strong>{queueSummary.waiting}</strong>
          <span>Waiting</span>
        </div>
        <div className="bp2__daily-stat bp2__daily-stat--live">
          <strong>{queueSummary.running}</strong>
          <span>Running</span>
        </div>
        <div className="bp2__daily-stat">
          <strong>{queueSummary.completed}</strong>
          <span>Completed (24h)</span>
        </div>
        <div className="bp2__daily-stat bp2__daily-stat--warn">
          <strong>{queueSummary.blocked}</strong>
          <span>Blocked</span>
        </div>
        <div className="bp2__daily-stat bp2__daily-stat--fail">
          <strong>{queueSummary.failed}</strong>
          <span>Failed (24h)</span>
        </div>
      </div>

      <div className="bp2__daily-report-grid">
        <div className="bp2__daily-report-block">
          <h3>What ran overnight</h3>
          {report.overnightJobs.length === 0 ? (
            <p className="bp2__muted">No large overnight batches in recent history.</p>
          ) : (
            <ul className="bp2__daily-list">
              {report.overnightJobs.map((job) => (
                <li key={job.id}>
                  <strong>{queueDepartmentLabel(job.department)}</strong>
                  <span>
                    {job.total} songs · {job.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bp2__daily-report-block">
          <h3>Failures</h3>
          {report.failures.length === 0 ? (
            <p className="bp2__muted">No failures in the last 24 hours.</p>
          ) : (
            <ul className="bp2__daily-list bp2__daily-list--fail">
              {report.failures.slice(0, 8).map((item, i) => (
                <li key={`${item.jobId}-${item.rvtr}-${i}`}>
                  <strong>{item.rvtr}</strong>
                  <span>{queueDepartmentLabel(item.department as never)}</span>
                  <em>{item.message}</em>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bp2__daily-report-block">
          <h3>Attention</h3>
          <ul className="bp2__daily-kv">
            <li>
              <span>Songs needing review</span>
              <strong>{report.needsReview.toLocaleString()}</strong>
            </li>
            <li>
              <span>Production-ready songs</span>
              <strong>{report.productionReady.toLocaleString()}</strong>
            </li>
          </ul>
        </div>

        {integrity ? (
          <div className="bp2__daily-report-block">
            <h3>Package Integrity</h3>
            <ul className="bp2__daily-kv">
              <li>
                <span>Complete packages</span>
                <strong>
                  {integrity.completePackages} / {integrity.totalPackages} ({integrity.completePct}%)
                </strong>
              </li>
              <li>
                <span>Missing Collector</span>
                <strong>{integrity.missingCollectorTotal}</strong>
              </li>
              <li>
                <span>Missing Editor</span>
                <strong>{integrity.missingEditorTotal}</strong>
              </li>
              <li>
                <span>Missing Director</span>
                <strong>{integrity.missingDirectorTotal}</strong>
              </li>
              <li>
                <span>Missing Render Spec</span>
                <strong>{integrity.missingRenderSpecTotal}</strong>
              </li>
              <li>
                <span>Outdated versions</span>
                <strong>{integrity.outdatedVersionsTotal}</strong>
              </li>
            </ul>
          </div>
        ) : null}

        <div className="bp2__daily-report-block">
          <h3>Top Patron Value</h3>
          <ul className="bp2__daily-list">
            {report.topPatronValue.slice(0, 5).map((row) => (
              <li key={row.rvtr}>
                <strong>{row.value}</strong>
                <span>
                  {row.artist} — {row.title}
                </span>
                <em>{row.rvtr}</em>
              </li>
            ))}
          </ul>
        </div>

        <div className="bp2__daily-report-block">
          <h3>Department Throughput (24h)</h3>
          {Object.keys(report.departmentThroughput).length === 0 ? (
            <p className="bp2__muted">No completed department runs in the last 24 hours.</p>
          ) : (
            <ul className="bp2__daily-kv">
              {Object.entries(report.departmentThroughput).map(([dept, stats]) => (
                <li key={dept}>
                  <span>{queueDepartmentLabel(dept as never)}</span>
                  <strong>
                    {stats.completed} done
                    {stats.avgProcessingTimeMs
                      ? ` · avg ${formatDurationShort(stats.avgProcessingTimeMs)}`
                      : ""}
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
