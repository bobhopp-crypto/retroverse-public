"use client";

import { getMetricTooltip } from "@/lib/ops/studio/operator-guide";

import { useOperatorGuideOptional } from "./OperatorGuideProvider";

type Props = {
  metricId: string;
  children: React.ReactNode;
  className?: string;
};

export function GuideTooltip({ metricId, children, className }: Props) {
  const guide = useOperatorGuideOptional();
  const tip = getMetricTooltip(metricId);

  if (!tip) {
    return <span className={className}>{children}</span>;
  }

  const title = guide?.enabled
    ? `${tip.meaning}\n\nWhy: ${tip.whyItMatters}\n\nGood: ${tip.goodValue}`
    : `${tip.label}: ${tip.meaning}`;

  return (
    <span className={`rs-guide-tip ${className ?? ""}`.trim()} title={title} data-guide-metric={metricId}>
      {children}
      {guide?.enabled ? (
        <span className="rs-guide-tip__hint" aria-hidden>
          ⓘ
        </span>
      ) : null}
    </span>
  );
}
