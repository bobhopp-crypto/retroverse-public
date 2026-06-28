import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LivingStudioHome } from "@/components/ops/studio/living";
import { StudioShell } from "@/components/ops/studio/StudioShell";
import { loadLivingStudioSnapshot } from "@/lib/ops/studio/living";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mission Control — Retroverse Studio",
  robots: { index: false, follow: false },
};

export default async function StudioDashboardPage() {
  if (!isOpsEnabled()) notFound();

  const snapshot = await loadLivingStudioSnapshot();

  return (
    <main className="ops-page ops-command ops-studio-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <StudioShell active="dashboard">
          <LivingStudioHome initialSnapshot={snapshot} />
        </StudioShell>
      </div>
    </main>
  );
}
