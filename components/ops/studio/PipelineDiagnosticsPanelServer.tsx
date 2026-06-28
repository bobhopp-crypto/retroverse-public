import type { PipelineHealthSnapshot } from "@/lib/ops/studio/pipeline-snapshot-types";
import { getPipelineHealthCached } from "@/lib/ops/studio/studio-cached-loaders";

import { PipelineDiagnosticsPanel } from "./PipelineDiagnosticsPanel";

type Props = {
  /** When provided (e.g. from dashboard snapshot), avoids a second pipeline build. */
  health?: PipelineHealthSnapshot;
};

/** Server-only loader — avoids passing health through client snapshot boundary. */
export async function PipelineDiagnosticsPanelServer({ health }: Props) {
  const resolved = health ?? (await getPipelineHealthCached());
  return <PipelineDiagnosticsPanel health={resolved} />;
}
