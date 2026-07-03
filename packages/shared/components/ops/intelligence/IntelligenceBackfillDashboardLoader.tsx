import { IntelligenceBackfillDashboard } from "@/components/ops/intelligence/IntelligenceBackfillDashboard";
import { loadVideoBackfillCoverage } from "@/lib/ops/intelligence/backfill-coverage";
import { buildVideoBackfillQueue, saveBackfillQueue } from "@/lib/ops/intelligence/backfill-queue";
import { loadTopPlayedBackfill } from "@/lib/ops/intelligence/top-played-backfill";
import { loadCoverRecoveryQueue } from "@/lib/ops/intelligence/cover-recovery-store";

export async function IntelligenceBackfillDashboardLoader() {
  const [{ coverage, videos }, topPlayed, coverRecovery] = await Promise.all([
    loadVideoBackfillCoverage(),
    loadTopPlayedBackfill(),
    loadCoverRecoveryQueue(),
  ]);
  const queue = buildVideoBackfillQueue(videos);
  void saveBackfillQueue(queue);

  return (
    <IntelligenceBackfillDashboard
      coverage={coverage}
      topPlayed={topPlayed}
      coverRecovery={coverRecovery}
    />
  );
}
