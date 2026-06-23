import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { IntelligenceBackfillDashboardLoader } from "@/components/ops/intelligence/IntelligenceBackfillDashboardLoader";
import { IntelligenceBackfillDashboardSkeleton } from "@/components/ops/intelligence/IntelligenceBackfillDashboardSkeleton";
import { Top100ValidationLivePanel } from "@/components/ops/intelligence/Top100ValidationLivePanel";
import { loadTop100ValidationProgress } from "@/lib/ops/intelligence/top100-validation-progress";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Song Package Backfill — Retroverse Ops",
  robots: { index: false, follow: false },
};

export default async function IntelligenceBackfillPage() {
  if (!isOpsEnabled()) notFound();

  const initialProgress = await loadTop100ValidationProgress();

  return (
    <main
      className="intel-app"
      style={{ background: "#ffffff", color: "#111111", minHeight: "100vh" }}
    >
      <div className="intel-app__body">
        <Link className="intel-review__back" href="/ops/intelligence" prefetch={false}>
          ← Package Center
        </Link>
        <Top100ValidationLivePanel initialProgress={initialProgress} />
        <Suspense fallback={<IntelligenceBackfillDashboardSkeleton />}>
          <IntelligenceBackfillDashboardLoader />
        </Suspense>
      </div>
    </main>
  );
}
