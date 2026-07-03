import Link from "next/link";

import { GuideEmptyState } from "@/components/ops/studio/operator-guide";
import { SongWorkspaceTabs } from "@/components/ops/studio/SongWorkspaceTabs";

type Props = {
  rvtr: string;
};

export function CollectorPackageMissing({ rvtr }: Props) {
  return (
    <div className="ops-collector-lib">
      <SongWorkspaceTabs active="research" />

      <p className="ops-collector__library-back">
        <Link className="ops-studio__back" href="/ops/studio/collector">
          ← Research Library
        </Link>
      </p>

      <GuideEmptyState
        title="No Collector package yet"
        explanation={`${rvtr} has not completed the Collector stage. Without collector.json, Editor and Director cannot run.`}
        recommendedAction="Run Collector from Library & Queue batch bar, or queue this RVTR from the library table."
        actionHref="/ops/browser-plus-2"
        actionLabel="Open Library & Queue"
      />
    </div>
  );
}
