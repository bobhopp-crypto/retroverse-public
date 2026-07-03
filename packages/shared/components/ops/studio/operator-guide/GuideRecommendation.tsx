"use client";

import Link from "next/link";

import type { SmartRecommendation } from "@/lib/ops/studio/operator-guide";

type Props = {
  recommendation: SmartRecommendation;
};

export function GuideRecommendation({ recommendation }: Props) {
  return (
    <aside className="rs-guide-rec" aria-label="Recommended action">
      <p className="rs-guide-rec__headline">{recommendation.headline}</p>
      <p className="rs-guide-rec__action">{recommendation.action}</p>
      {recommendation.actionHref && recommendation.actionLabel ? (
        <Link className="rs-guide-rec__link" href={recommendation.actionHref}>
          {recommendation.actionLabel} →
        </Link>
      ) : null}
    </aside>
  );
}
