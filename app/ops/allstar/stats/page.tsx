import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AllStarStatsPanel } from "@/components/ops/allstar/AllStarStatsPanel";
import { AllStarShell } from "@/components/ops/allstar/AllStarShell";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../../ops.css";
import "../allstar.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bob League Stats",
  robots: { index: false, follow: false },
};

export default function AllStarStatsPage() {
  if (!isOpsEnabled()) notFound();

  return (
    <main className="ops-page ops-command ops-allstar-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <AllStarShell
          active="stats"
          title="Bob League Statistics"
          lead="Batting and pitching leaders, team standings, player search."
        >
          <AllStarStatsPanel />
        </AllStarShell>
      </div>
    </main>
  );
}
