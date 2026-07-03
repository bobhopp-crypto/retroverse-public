import Link from "next/link";

import { PIPELINE_STAGE_COPY } from "@/lib/ops/studio/living/mission-control-copy";
import {
  formatMetricCount,
  safeMetricCount,
} from "@/lib/ops/studio/living/mission-control-format";
import type { LivingPipelineNode } from "@/lib/ops/studio/living/types";

type Props = {
  pipeline?: LivingPipelineNode[] | null;
};

const PRODUCTION_STAGES = ["collector", "editor", "director", "publisher"] as const;

export function MissionControlProductionFlow({ pipeline }: Props) {
  const stages = PRODUCTION_STAGES.map((id) => (pipeline ?? []).find((n) => n.stage === id)).filter(
    (n): n is LivingPipelineNode => n != null,
  );

  return (
    <section className="rs-mc-flow" aria-label="Production pipeline">
      <h2 className="rs-mc-section-title">How a song moves through Studio</h2>
      <ol className="rs-mc-flow__list">
        {stages.map((node, index) => {
          const copy = PIPELINE_STAGE_COPY[node.stage as keyof typeof PIPELINE_STAGE_COPY];
          const statusLabel = node.isActive ? copy.activeLabel : copy.idleLabel;
          const queueCount = safeMetricCount(node.count);
          const queueNote =
            !node.isActive && queueCount > 0
              ? `${formatMetricCount(queueCount)} in queue`
              : node.isActive
                ? "In progress now"
                : "Standing by";

          return (
            <li
              key={node.stage}
              className={[
                "rs-mc-flow__step",
                node.isActive ? "rs-mc-flow__step--active" : "",
                queueCount > 0 && !node.isActive ? "rs-mc-flow__step--queued" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {index > 0 ? <span className="rs-mc-flow__arrow" aria-hidden>↓</span> : null}
              <Link href={node.href} className="rs-mc-flow__card">
                <div className="rs-mc-flow__head">
                  <h3 className="rs-mc-flow__name">{node.label}</h3>
                  <span className="rs-mc-flow__status">{statusLabel}</span>
                </div>
                <p className="rs-mc-flow__role">{copy.role}</p>
                <p className="rs-mc-flow__queue">{queueNote}</p>
              </Link>
              {node.isActive ? <span className="rs-mc-flow__pulse" aria-hidden /> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
