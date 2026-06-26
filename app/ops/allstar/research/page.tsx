import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AllStarResearchPanel } from "@/components/ops/allstar/AllStarResearchPanel";
import { AllStarShell } from "@/components/ops/allstar/AllStarShell";
import { buildCollectionIntelligence } from "@/lib/ops/allstar/intelligence/load-intelligence";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../../ops.css";
import "../allstar.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cadaco Research — All-Star Baseball",
  robots: { index: false, follow: false },
};

export default async function AllStarResearchPage() {
  if (!isOpsEnabled()) notFound();

  const intelligence = await buildCollectionIntelligence();

  return (
    <main className="ops-page ops-command ops-allstar-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <AllStarShell
          active="research"
          title="Cadaco Formula Research"
          lead="Disc vs MLB correlations, era analysis, and accuracy rankings across the preserved collection."
        >
          <AllStarResearchPanel intelligence={intelligence} />
        </AllStarShell>
      </div>
    </main>
  );
}
