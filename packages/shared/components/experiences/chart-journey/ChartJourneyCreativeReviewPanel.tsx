"use client";

import type { ChartJourneyCreativeReview } from "@/lib/experiences/chart-journey/types";

type Props = {
  review: ChartJourneyCreativeReview;
};

export function ChartJourneyCreativeReviewPanel({ review }: Props) {
  return (
    <section className="cj-review" aria-label="Chart Journey creative review">
      <header className="cj-review__head">
        <h2>Creative Review</h2>
        <p className="cj-review__score">{review.overallScore}/100</p>
        <p className="cj-review__verdict">{review.verdict}</p>
      </header>
      <dl className="cj-review__grid">
        {review.dimensions.map((dim) => (
          <div key={dim.id} className="cj-review__item">
            <dt>{dim.label}</dt>
            <dd>{dim.score}</dd>
            <p>{dim.note}</p>
          </div>
        ))}
      </dl>
    </section>
  );
}
