"use client";

import Link from "next/link";
import { useState } from "react";

import type { DirectorAnalyticsSnapshot } from "@/lib/ops/studio/director/coaching/types";
import type { SpotReviewBatch, TrainingHealthSnapshot } from "@/lib/ops/studio/training/types";
import type { PublisherCard } from "@/lib/ops/studio/publisher/types";

import { DirectorAnalyticsDashboard } from "./DirectorAnalyticsDashboard";

type Props = {
  health: TrainingHealthSnapshot;
  recentSpotReviews: SpotReviewBatch[];
  pilotRvtrs?: string[];
  publisherQueue?: PublisherCard[];
  directorAnalytics?: DirectorAnalyticsSnapshot;
};

function trendLabel(trend: string): string {
  if (trend === "up") return "↑ improving";
  if (trend === "down") return "↓ declining";
  return "→ stable";
}

export function TrainingHealthDashboard({
  health,
  recentSpotReviews,
  pilotRvtrs = [],
  publisherQueue = [],
  directorAnalytics,
}: Props) {
  const [spotBusy, setSpotBusy] = useState(false);
  const [spotResult, setSpotResult] = useState<SpotReviewBatch | null>(null);
  const [spotError, setSpotError] = useState<string | null>(null);

  async function runSpotReview() {
    if (pilotRvtrs.length === 0) {
      setSpotError("No pilot RVTRs available for spot review.");
      return;
    }
    setSpotBusy(true);
    setSpotError(null);
    try {
      const res = await fetch("/api/ops/studio/training/spot-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rvtrs: pilotRvtrs, batchSize: 20 }),
      });
      const data = (await res.json()) as { ok?: boolean; batch?: SpotReviewBatch; error?: string };
      if (!res.ok || !data.ok || !data.batch) throw new Error(data.error ?? "spot_failed");
      setSpotResult(data.batch);
    } catch (err) {
      setSpotError(err instanceof Error ? err.message : "Spot review failed");
    } finally {
      setSpotBusy(false);
    }
  }

  return (
    <div className="rs-training-health">
      <header className="rs-training-health__head">
        <h1 className="rs-training-health__title">Department Health</h1>
        <p className="rs-training-health__lead">
          Train each worker until it consistently produces excellent work — not every song needs review.
        </p>
      </header>

      <div className="rs-training-health__grid">
        {health.departments.map((row) => (
          <article key={row.department} className="rs-training-health__card">
            <h2 className="rs-training-health__dept">{row.label}</h2>
            <p className="rs-training-health__score">{row.averageConfidence}%</p>
            <dl className="rs-training-health__stats">
              <div>
                <dt>Approval rate</dt>
                <dd>{row.averageApprovalRate}%</dd>
              </div>
              <div>
                <dt>Needs coaching</dt>
                <dd>{row.needsCoachingCount}</dd>
              </div>
              <div>
                <dt>Rejected</dt>
                <dd>{row.rejectedCount}</dd>
              </div>
              <div>
                <dt>Reviews</dt>
                <dd>{row.reviewCount}</dd>
              </div>
              <div>
                <dt>Last reviewed</dt>
                <dd>{row.lastReviewedAt ? new Date(row.lastReviewedAt).toLocaleDateString() : "—"}</dd>
              </div>
              <div>
                <dt>Trend</dt>
                <dd>{trendLabel(row.trend)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      {directorAnalytics ? <DirectorAnalyticsDashboard analytics={directorAnalytics} /> : null}

      {publisherQueue.length > 0 ? (
        <section className="rs-training-health__publisher">
          <h2 className="rs-training-health__spot-title">Publisher queue</h2>
          <p className="rs-training-health__spot-lead">
            Packages needing editorial attention — review in Publisher before patrons see them.
          </p>
          <ul className="rs-training-health__publisher-list">
            {publisherQueue.map((card) => (
              <li key={card.rvtr}>
                <Link href={`/ops/studio/publisher/${card.rvtr}`}>
                  {card.title} · {card.artist}
                </Link>
                <span>{card.publicationClass.replace("_", " ")} · {card.qualityScore}%</span>
              </li>
            ))}
          </ul>
          <p>
            <Link href="/ops/studio/publisher">Open Publisher board →</Link>
          </p>
        </section>
      ) : null}

      <section className="rs-training-health__spot">
        <h2 className="rs-training-health__spot-title">Spot Review</h2>
        <p className="rs-training-health__spot-lead">
          From a batch of 20 songs, automatically pick 3 representatives (confidence, risk, random).
        </p>
        <button type="button" className="rs-training-health__spot-btn" disabled={spotBusy} onClick={runSpotReview}>
          {spotBusy ? "Sampling…" : "Run spot review on pilot batch"}
        </button>
        {spotError ? <p className="rs-training-health__spot-error">{spotError}</p> : null}
        {spotResult ? (
          <ul className="rs-training-health__spot-list">
            {spotResult.rvtrs.map((rvtr) => (
              <li key={rvtr}>
                <Link href={`/ops/studio/training/${rvtr}/collector`}>{rvtr}</Link>
              </li>
            ))}
          </ul>
        ) : null}
        {recentSpotReviews.length > 0 ? (
          <div className="rs-training-health__recent">
            <h3>Recent spot batches</h3>
            <ul>
              {recentSpotReviews.slice(0, 5).map((batch) => (
                <li key={batch.id}>
                  {new Date(batch.sampledAt).toLocaleDateString()} — {batch.rvtrs.join(", ")}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
