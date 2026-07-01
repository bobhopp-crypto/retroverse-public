import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { RetroverseExplorerView } from "@/components/bobos/explorer/RetroverseExplorerView";
import { loadExplorerEntity } from "@/lib/bobos/explorer/load-explorer-entity";
import {
  loadPipelineStageOutput,
  parsePipelineStage,
} from "@/lib/bobos/pipeline/load-pipeline-stage";
import { resolveHomepageRvtr } from "@/lib/home/homepage-rvtr";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";
import { normalizeRvtr } from "@/lib/studio/status";

export const metadata: Metadata = {
  title: "Retroverse Explorer — BobOS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    rvtr?: string;
    rvar?: string;
    rval?: string;
    artist?: string;
    stage?: string;
  }>;
};

export default async function RetroverseExplorerPage({ searchParams }: Props) {
  if (!shouldAllowOpsRoutes()) notFound();

  const params = await searchParams;
  const stage = parsePipelineStage(params.stage);

  const manualRvtr = params.rvtr?.trim() ?? "";
  const rvar = params.rvar?.trim() ?? "";
  const rval = params.rval?.trim() ?? "";
  const artist = params.artist?.trim() ?? "";

  const manualSelection = Boolean(manualRvtr || rvar || rval || artist);

  let resolution = null;
  let rvtr: string | null = null;

  if (manualRvtr) {
    rvtr = normalizeRvtr(manualRvtr) ?? manualRvtr.toUpperCase();
  } else if (rvar || rval || artist) {
    rvtr = null;
  } else {
    resolution = await resolveHomepageRvtr(null);
    rvtr = resolution.rvtr;
  }

  const [pipelineResult, entity] = await Promise.all([
    rvtr && !rvar && !rval && !artist
      ? loadPipelineStageOutput(rvtr, stage)
      : Promise.resolve(null),
    rvar || rval || artist ? loadExplorerEntity({ rvar, rval, artist }) : Promise.resolve(null),
  ]);

  return (
    <Suspense fallback={<p className="rv-explorer__loading">Loading Retroverse Explorer…</p>}>
      <RetroverseExplorerView
        stage={stage}
        resolution={resolution}
        pipelineResult={pipelineResult}
        entity={entity}
        rotationRvtr={!manualSelection ? rvtr : null}
        manualSelection={manualSelection}
      />
    </Suspense>
  );
}
