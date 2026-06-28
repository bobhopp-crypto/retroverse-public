"use client";

import type { VisualProductionPlan } from "@/lib/ops/studio/publisher/visual-producer/types";

type Props = {
  plan: VisualProductionPlan | null;
};

export function VisualProducerReviewPanel({ plan }: Props) {
  if (!plan) {
    return (
      <section className="rs-publisher-vp">
        <h2 className="rs-publisher-vp__title">Visual Producer</h2>
        <p className="rs-publisher-vp__empty">No visual production plan — run Publisher evaluation to generate.</p>
      </section>
    );
  }

  const { review, scenes } = plan;

  return (
    <section className="rs-publisher-vp">
      <header className="rs-publisher-vp__head">
        <h2 className="rs-publisher-vp__title">Visual Producer Review</h2>
        <p className="rs-publisher-vp__score">
          Production score <strong>{review.productionScore}/100</strong>
          {review.passed ? " · Passed" : " · Needs attention"}
        </p>
        <p className="rs-publisher-vp__identity">{plan.creativeIdentity}</p>
        <p className="rs-publisher-vp__rhythm">Rhythm: {plan.overallRhythm}</p>
      </header>

      <dl className="rs-publisher-vp__checks">
        <div><dt>Layout</dt><dd>{review.layoutConsistency ? "Consistent" : "Review"}</dd></div>
        <div><dt>Media</dt><dd>{review.mediaQuality ? "Hero images assigned" : "Gaps"}</dd></div>
        <div><dt>Typography</dt><dd>{review.typographyHierarchy ? "Hierarchy OK" : "Review"}</dd></div>
        <div><dt>Rhythm</dt><dd>{review.spacingRhythm ? "Good pacing" : "Fatigue risk"}</dd></div>
      </dl>

      {review.missingHeroImages.length > 0 ? (
        <div className="rs-publisher-vp__warn">
          <h3>Missing hero images</h3>
          <ul>{review.missingHeroImages.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
      ) : null}

      {review.visualRepetitionWarnings.length > 0 ? (
        <div className="rs-publisher-vp__warn">
          <h3>Visual repetition</h3>
          <ul>{review.visualRepetitionWarnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
      ) : null}

      <div className="rs-publisher-vp__scenes">
        <h3>Produced scenes ({scenes.length})</h3>
        <ol className="rs-publisher-vp__scene-list">
          {scenes.map((scene) => (
            <li key={scene.pageId}>
              <strong>{scene.layout.replace(/_/g, " ")}</strong> — {scene.headline}
              <span className="rs-publisher-vp__eye">{scene.composition.eyePath}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
