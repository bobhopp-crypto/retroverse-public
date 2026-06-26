import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AllStarBinderPanel } from "@/components/ops/allstar/AllStarBinderPanel";
import { AllStarShell } from "@/components/ops/allstar/AllStarShell";
import { buildCollectionIntelligence } from "@/lib/ops/allstar/intelligence/load-intelligence";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../../ops.css";
import "../allstar.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Digital Binder — All-Star Baseball",
  robots: { index: false, follow: false },
};

export default async function AllStarBinderPage() {
  if (!isOpsEnabled()) notFound();

  const intelligence = await buildCollectionIntelligence();

  return (
    <main className="ops-page ops-command ops-allstar-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <AllStarShell
          active="binder"
          title="Digital Binder"
          lead="Browse preserved discs like a collector album — by team, position, and Hall of Fame pages."
        >
          <AllStarBinderPanel pages={intelligence.binderPages} />
        </AllStarShell>
      </div>
    </main>
  );
}
