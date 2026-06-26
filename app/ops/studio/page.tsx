import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CollectorLiveCard } from "@/components/ops/studio/CollectorLiveCard";
import { StudioDepartmentCard } from "@/components/ops/studio/StudioDepartmentCard";
import { StudioShell } from "@/components/ops/studio/StudioShell";
import { loadCollectorPageContext } from "@/lib/ops/studio/collector/load-dashboard";
import { loadCollectorLibraryIndex } from "@/lib/ops/studio/collector/load-library";
import { STUDIO_ACTIVE, STUDIO_COMING_SOON } from "@/lib/ops/studio/departments";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio — Retroverse Command Center",
  robots: { index: false, follow: false },
};

export default async function StudioDashboardPage() {
  if (!isOpsEnabled()) notFound();

  const [collectorContext, libraryIndex] = await Promise.all([
    loadCollectorPageContext(),
    loadCollectorLibraryIndex(),
  ]);

  return (
    <main className="ops-page ops-command ops-studio-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <StudioShell
          active="dashboard"
          title="Studio"
          lead="The creative engine behind Retroverse."
        >
          <div className="ops-studio__grid">
            {STUDIO_ACTIVE.map((dept) =>
              dept.id === "collector" ? (
                <CollectorLiveCard
                  key={dept.id}
                  initialStats={collectorContext.stats}
                  initialCard={collectorContext.dashboardCard}
                  packageCount={libraryIndex.stats.packageCount}
                />
              ) : (
                <StudioDepartmentCard key={dept.id} dept={dept} />
              ),
            )}
          </div>

          <section className="ops-studio__future" aria-labelledby="studio-coming-soon">
            <h2 id="studio-coming-soon" className="ops-studio__future-title">
              Coming Soon
            </h2>
            <div className="ops-studio__future-grid">
              {STUDIO_COMING_SOON.map((dept) => (
                <StudioDepartmentCard key={dept.id} dept={dept} disabled />
              ))}
            </div>
          </section>
        </StudioShell>
      </div>
    </main>
  );
}
