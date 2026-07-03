import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AllStarLibraryTable } from "@/components/ops/allstar/AllStarLibraryTable";
import { AllStarShell } from "@/components/ops/allstar/AllStarShell";
import { loadAllStarSnapshot } from "@/lib/ops/allstar/load-allstar";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../../ops.css";
import "../allstar.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All-Star Disc Library — Command Center",
  robots: { index: false, follow: false },
};

export default async function AllStarLibraryPage() {
  if (!isOpsEnabled()) notFound();

  const snapshot = await loadAllStarSnapshot();

  return (
    <main className="ops-page ops-command">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <AllStarShell
          active="library"
          title="Disc Library"
          lead="Browse scanned player discs, filter by position, and open analysis views."
        >
          <AllStarLibraryTable discs={snapshot.discs} />
        </AllStarShell>
      </div>
    </main>
  );
}
