import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AllStarExplorerPanel } from "@/components/ops/allstar/AllStarExplorerPanel";
import { AllStarShell } from "@/components/ops/allstar/AllStarShell";
import { buildCollectionIntelligence } from "@/lib/ops/allstar/intelligence/load-intelligence";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../../ops.css";
import "../allstar.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Collection Explorer — All-Star Baseball",
  robots: { index: false, follow: false },
};

export default async function AllStarExplorerPage() {
  if (!isOpsEnabled()) notFound();

  const intelligence = await buildCollectionIntelligence();
  const positions = [...new Set(intelligence.explorerEntries.map((e) => e.position).filter(Boolean))].sort();
  const teams = [
    ...new Set(intelligence.explorerEntries.flatMap((e) => e.teams).filter(Boolean)),
  ].sort();
  const decades = [...new Set(intelligence.explorerEntries.map((e) => e.decade).filter(Boolean))].sort();

  return (
    <main className="ops-page ops-command ops-allstar-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <AllStarShell
          active="explorer"
          title="Collection Explorer"
          lead="Search, filter, and browse the preserved Cadaco library as a baseball research archive."
        >
          <AllStarExplorerPanel
            entries={intelligence.explorerEntries}
            positions={positions}
            teams={teams}
            decades={decades}
          />
        </AllStarShell>
      </div>
    </main>
  );
}
