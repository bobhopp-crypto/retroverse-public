import { notFound } from "next/navigation";

import { PublisherDashboard } from "@/components/ops/studio/publisher";
import { DepartmentLivingChrome } from "@/components/ops/studio/living";
import { StudioGuideChrome } from "@/components/ops/studio/operator-guide";
import { StudioShell } from "@/components/ops/studio/StudioShell";
import { buildPublisherDashboardReadOnly } from "@/lib/ops/studio/publisher/list-packages";
import { getStudioDepartment } from "@/lib/ops/studio/departments";
import { loadDepartmentLivingSnapshotLite } from "@/lib/ops/studio/living";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "./publisher.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Publisher — Retroverse Studio",
  robots: { index: false, follow: false },
};

export default async function PublisherDepartmentPage() {
  if (!isOpsEnabled()) notFound();

  const dept = getStudioDepartment("publisher");
  if (!dept) notFound();

  const [{ metrics, columns }, department] = await Promise.all([
    buildPublisherDashboardReadOnly(),
    loadDepartmentLivingSnapshotLite("publisher"),
  ]);

  return (
    <main className="ops-page ops-command ops-studio-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <StudioShell active="publisher" guidePage="publisher" lead={dept.mission}>
          <StudioGuideChrome pageId="publisher" />
          <DepartmentLivingChrome department={department}>
            <PublisherDashboard metrics={metrics} columns={columns} />
          </DepartmentLivingChrome>
        </StudioShell>
      </div>
    </main>
  );
}
