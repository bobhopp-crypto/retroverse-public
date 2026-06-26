import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AllStarArchiveDashboard } from "@/components/ops/allstar/AllStarArchiveDashboard";
import { AllStarShell } from "@/components/ops/allstar/AllStarShell";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../ops.css";
import "./allstar.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All-Star Baseball — Living Archive",
  robots: { index: false, follow: false },
};

export default async function AllStarDashboardPage() {
  if (!isOpsEnabled()) notFound();

  return (
    <main className="ops-page ops-command ops-allstar-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <AllStarShell
          active="dashboard"
          title="Living Archive"
          lead="Vintage Cadaco discs reconstructed in real time — geometry, probabilities, and baseball history preserved as each player enters the collection."
        >
          <AllStarArchiveDashboard />
        </AllStarShell>
      </div>
    </main>
  );
}
