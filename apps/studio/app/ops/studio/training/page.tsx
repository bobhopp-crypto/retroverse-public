import Link from "next/link";

import { TrainingHealthDashboard } from "@/components/ops/studio/training";
import { StudioGuideChrome } from "@/components/ops/studio/operator-guide";
import { StudioShell } from "@/components/ops/studio/StudioShell";
import { buildDirectorAnalytics } from "@/lib/ops/studio/director/coaching";
import { listPackagesNeedingPublisherReview } from "@/lib/ops/studio/publisher/list-packages";
import { buildTrainingHealthSnapshot } from "@/lib/ops/studio/training/department-health";
import { listSpotReviewBatches } from "@/lib/ops/studio/training/store";
import { loadMuseumPilotRegistry } from "@/lib/retroverse/renderer/museum-pilot-registry";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Training — Retroverse Studio",
};

export default async function TrainingHealthPage() {
  const [health, spotReviews, pilot, publisherQueue, directorAnalytics] = await Promise.all([
    buildTrainingHealthSnapshot(),
    listSpotReviewBatches(),
    loadMuseumPilotRegistry().catch(() => null),
    listPackagesNeedingPublisherReview(8),
    buildDirectorAnalytics(),
  ]);

  const pilotRvtrs = pilot?.songs.map((s) => s.rvtr) ?? [];

  return (
    <StudioShell active="dashboard" guidePage="dashboard" title="Training Mode" lead="Production academy — department health and spot review.">
      <StudioGuideChrome pageId="dashboard" />
      <p className="rs-training-health__nav-link">
        <Link href="/ops/studio">← Mission Control</Link>
        {" · "}
        Enable <strong>Training Mode</strong> in the guide bar, then select a song to walk the pipeline.
      </p>
      <TrainingHealthDashboard
        health={health}
        recentSpotReviews={spotReviews}
        pilotRvtrs={pilotRvtrs}
        publisherQueue={publisherQueue}
        directorAnalytics={directorAnalytics}
      />
    </StudioShell>
  );
}
