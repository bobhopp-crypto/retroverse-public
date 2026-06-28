"use client";

import Link from "next/link";

import type { LivingPipelineNode } from "@/lib/ops/studio/living/types";

type Props = {
  pipeline: LivingPipelineNode[];
  compact?: boolean;
};

export function AnimatedPipeline({ pipeline, compact = false }: Props) {
  return (
    <nav
      className={compact ? "rs-living-pipeline rs-living-pipeline--compact" : "rs-living-pipeline"}
      aria-label="Production pipeline"
    >
      <ol className="rs-living-pipeline__list">
        {pipeline.map((node, index) => (
          <li
            key={node.stage}
            className={[
              "rs-living-pipeline__node",
              node.isActive ? "rs-living-pipeline__node--active" : "",
              node.count > 0 ? "rs-living-pipeline__node--has-work" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {index > 0 ? <span className="rs-living-pipeline__arrow" aria-hidden>↓</span> : null}
            <Link href={node.href} className="rs-living-pipeline__link">
              <span className="rs-living-pipeline__label">{node.label}</span>
              {node.isActive ? (
                <span className="rs-living-pipeline__processing">{node.processingLabel}</span>
              ) : (
                <span className="rs-living-pipeline__count">
                  {node.count > 0 ? `${node.count} in stage` : "—"}
                </span>
              )}
            </Link>
            {node.isActive ? <span className="rs-living-pipeline__pulse" aria-hidden /> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
