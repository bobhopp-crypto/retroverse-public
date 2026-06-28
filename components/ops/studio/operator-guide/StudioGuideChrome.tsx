"use client";

import type { StudioGuidePageId } from "@/lib/ops/studio/operator-guide";

import { AboutThisPage } from "./AboutThisPage";
import { DepartmentContextPanel } from "./DepartmentContextPanel";
import { GuideTour, GuideTourTrigger } from "./GuideTour";
import { OperatorGuideToggle } from "./OperatorGuideToggle";
import { ProductionPipeline } from "./ProductionPipeline";
import { TrainingModeToggle } from "@/components/ops/studio/training";

type Props = {
  pageId: StudioGuidePageId;
};

/** Shared operator-guide chrome for Studio and Mission Control pages. */
export function StudioGuideChrome({ pageId }: Props) {
  return (
    <div className="rs-guide-chrome">
      <div className="rs-guide-chrome__bar">
        <OperatorGuideToggle />
        <TrainingModeToggle />
        <ProductionPipeline pageId={pageId} />
        <GuideTourTrigger pageId={pageId} />
      </div>
      <AboutThisPage pageId={pageId} />
      <DepartmentContextPanel pageId={pageId} />
      <GuideTour pageId={pageId} />
    </div>
  );
}
