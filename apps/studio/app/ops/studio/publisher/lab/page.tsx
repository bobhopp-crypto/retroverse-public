import { notFound } from "next/navigation";

import { ExperienceLabDashboard } from "@/components/ops/studio/publisher/ExperienceLabDashboard";
import { StudioGuideChrome } from "@/components/ops/studio/operator-guide";
import { StudioShell } from "@/components/ops/studio/StudioShell";
import { buildExperiencePatterns } from "@/lib/ops/studio/publisher/experience/patterns";
import { getLatestDriftReport } from "@/lib/ops/studio/publisher/experience/store";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../publisher.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Quality Lab — Publisher",
};

export default async function PublisherLabPage() {
  if (!isOpsEnabled()) notFound();

  const [patterns, drift] = await Promise.all([
    buildExperiencePatterns(),
    getLatestDriftReport(),
  ]);

  return (
    <main className="ops-page ops-command ops-studio-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <StudioShell active="publisher" guidePage="publisher" lead="Experience evolution laboratory">
          <StudioGuideChrome pageId="publisher" />
          <ExperienceLabDashboard patterns={patterns} drift={drift} />
        </StudioShell>
      </div>
    </main>
  );
}
