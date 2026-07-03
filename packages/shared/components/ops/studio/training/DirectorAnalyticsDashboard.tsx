"use client";

import type { DirectorAnalyticsSnapshot } from "@/lib/ops/studio/director/coaching/types";

type Props = {
  analytics: DirectorAnalyticsSnapshot;
};

export function DirectorAnalyticsDashboard({ analytics }: Props) {
  return (
    <section className="rs-dir-analytics">
      <header className="rs-dir-analytics__head">
        <h2 className="rs-dir-analytics__title">Director Analytics</h2>
        <p className="rs-dir-analytics__trend">
          Trend: <strong>{analytics.recentTrend}</strong>
        </p>
      </header>

      <div className="rs-dir-analytics__grid">
        <article><p className="rs-dir-analytics__value">{analytics.publisherApprovalRate}%</p><p className="rs-dir-analytics__label">Publisher approval</p></article>
        <article><p className="rs-dir-analytics__value">{analytics.averagePublisherScore}</p><p className="rs-dir-analytics__label">Avg publisher score</p></article>
        <article><p className="rs-dir-analytics__value">{analytics.averageExhibitsPerExperience}</p><p className="rs-dir-analytics__label">Avg exhibits</p></article>
        <article><p className="rs-dir-analytics__value">{analytics.songsCoached}</p><p className="rs-dir-analytics__label">Songs coached</p></article>
        <article><p className="rs-dir-analytics__value">{analytics.songsNeedingIntervention}</p><p className="rs-dir-analytics__label">Need intervention</p></article>
        <article><p className="rs-dir-analytics__value">{analytics.totalCoachingRecords}</p><p className="rs-dir-analytics__label">Coaching records</p></article>
      </div>

      <div className="rs-dir-analytics__cols">
        <div>
          <h3>Most rejected exhibit</h3>
          <p>{analytics.mostRejectedExhibit?.replace(/_/g, " ") ?? "—"}</p>
        </div>
        <div>
          <h3>Most accepted frame category</h3>
          <p>{analytics.mostAcceptedFrameCategory ?? "—"}</p>
        </div>
      </div>

      {analytics.topCoachingReasons.length > 0 ? (
        <div className="rs-dir-analytics__reasons">
          <h3>Top coaching reasons</h3>
          <ul>
            {analytics.topCoachingReasons.map((row) => (
              <li key={row.id}>
                <span>{row.reason}</span>
                <strong>{row.count}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {analytics.categoryPreference.length > 0 ? (
        <div className="rs-dir-analytics__cats">
          <h3>Frame category preference</h3>
          <ul>
            {analytics.categoryPreference.map((row) => (
              <li key={row.id}>
                <span>{row.category}</span>
                <span>+{row.accepted} / −{row.rejected}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
