import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AllStarPreservePanel } from "@/components/ops/allstar/AllStarPreservePanel";
import { AllStarShell } from "@/components/ops/allstar/AllStarShell";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../../ops.css";
import "../allstar.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Preservation Queue",
  robots: { index: false, follow: false },
};

export default function AllStarPreservePage() {
  if (!isOpsEnabled()) notFound();

  return (
    <main className="ops-page ops-command ops-allstar-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <AllStarShell
          active="preserve"
          title="Preservation Queue"
          lead="Batch engine — start, pause, resume, retry. Auto-saves every disc."
        >
          <AllStarPreservePanel />
        </AllStarShell>
      </div>
    </main>
  );
}
