import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DirectorProductionRoom } from "@/components/ops/studio/living";
import { StudioGuideChrome } from "@/components/ops/studio/operator-guide";
import { StudioShell } from "@/components/ops/studio/StudioShell";
import { getStudioDepartment } from "@/lib/ops/studio/departments";
import { loadDirectorProductionSnapshot } from "@/lib/ops/studio/living";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Director — Studio",
  robots: { index: false, follow: false },
};

export default async function DirectorDepartmentPage() {
  if (!isOpsEnabled()) notFound();

  const dept = getStudioDepartment("director");
  if (!dept) notFound();

  const snapshot = await loadDirectorProductionSnapshot();

  return (
    <main className="ops-page ops-command ops-studio-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <StudioShell active="director" guidePage="director" lead={dept.mission}>
          <StudioGuideChrome pageId="director" />
          <DirectorProductionRoom snapshot={snapshot} />
        </StudioShell>
      </div>
    </main>
  );
}
