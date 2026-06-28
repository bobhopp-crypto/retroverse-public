"use client";

import Link from "next/link";

import type { PipelineStageId, StudioGuidePageId } from "@/lib/ops/studio/operator-guide";
import { useTrainingModeOptional } from "@/components/ops/studio/training";

const STAGES: Array<{ id: PipelineStageId; label: string }> = [
  { id: "collector", label: "Collector" },
  { id: "editor", label: "Editor" },
  { id: "director", label: "Director" },
  { id: "publisher", label: "Publisher" },
  { id: "renderer", label: "Renderer" },
];

const PAGE_TO_STAGE: Partial<Record<StudioGuidePageId, PipelineStageId>> = {
  collector: "collector",
  editor: "editor",
  director: "director",
  publisher: "publisher",
};

type Props = {
  pageId: StudioGuidePageId;
};

export function ProductionPipeline({ pageId }: Props) {
  const activeStage = PAGE_TO_STAGE[pageId];
  const training = useTrainingModeOptional();

  return (
    <nav className="rs-guide-pipeline" aria-label="Production pipeline" data-guide="studio-pipeline">
      <ol className="rs-guide-pipeline__list">
        {STAGES.map((stage, index) => {
          const isActive = stage.id === activeStage;
          const href =
            training?.trainingMode && training.activeRvtr
              ? `/ops/studio/training/${training.activeRvtr}/${stage.id}`
              : null;

          return (
            <li
              key={stage.id}
              className={[
                "rs-guide-pipeline__stage",
                isActive ? "rs-guide-pipeline__stage--active" : "",
                href ? "rs-guide-pipeline__stage--link" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {index > 0 ? <span className="rs-guide-pipeline__arrow" aria-hidden>↓</span> : null}
              {href ? (
                <Link href={href} className="rs-guide-pipeline__label rs-guide-pipeline__label--link">
                  {stage.label}
                </Link>
              ) : (
                <span className="rs-guide-pipeline__label">{stage.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
