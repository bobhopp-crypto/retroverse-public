import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AllStarSeasonsPanel } from "@/components/ops/allstar/AllStarSeasonsPanel";
import { AllStarShell } from "@/components/ops/allstar/AllStarShell";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../../ops.css";
import "../allstar.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bob League Seasons",
  robots: { index: false, follow: false },
};

export default function AllStarSeasonsPage() {
  if (!isOpsEnabled()) notFound();

  return (
    <main className="ops-page ops-command ops-allstar-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <AllStarShell
          active="seasons"
          title="Bob League Seasons"
          lead="Create and manage seasons for tabletop and manual scorekeeping."
        >
          <AllStarSeasonsPanel />
        </AllStarShell>
      </div>
    </main>
  );
}
