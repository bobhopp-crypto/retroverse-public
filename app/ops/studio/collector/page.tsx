import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CollectorLibraryHome } from "@/components/ops/studio/CollectorLibraryHome";
import { StudioShell } from "@/components/ops/studio/StudioShell";
import { loadCollectorLibraryIndex } from "@/lib/ops/studio/collector/load-library";
import { getStudioDepartment } from "@/lib/ops/studio/departments";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Research Library — Collector",
  robots: { index: false, follow: false },
};

export default async function CollectorLibraryPage() {
  if (!isOpsEnabled()) notFound();

  const dept = getStudioDepartment("collector");
  if (!dept) notFound();

  const index = await loadCollectorLibraryIndex();

  return (
    <main className="ops-page ops-command ops-studio-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <StudioShell active="collector" lead={dept.mission}>
          <CollectorLibraryHome index={index} />
        </StudioShell>
      </div>
    </main>
  );
}
