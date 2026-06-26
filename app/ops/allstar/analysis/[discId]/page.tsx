import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AllStarAnalysisPanel } from "@/components/ops/allstar/AllStarAnalysisPanel";
import { AllStarShell } from "@/components/ops/allstar/AllStarShell";
import { loadAllStarDisc } from "@/lib/ops/allstar/load-allstar";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../../../ops.css";
import "../../allstar.css";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ discId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { discId } = await params;
  const disc = await loadAllStarDisc(discId);
  return {
    title: disc?.player
      ? `${disc.player} — All-Star Analysis`
      : "Disc Analysis — All-Star Baseball",
    robots: { index: false, follow: false },
  };
}

export default async function AllStarAnalysisPage({ params }: Props) {
  if (!isOpsEnabled()) notFound();

  const { discId } = await params;
  const disc = await loadAllStarDisc(discId);
  if (!disc) notFound();

  return (
    <main className="ops-page ops-command">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <AllStarShell
          active="analysis"
          title={disc.player || "Disc Analysis"}
          lead={disc.position ? `${disc.position} · ${disc.scanFilename}` : disc.scanFilename}
        >
          <AllStarAnalysisPanel disc={disc} />
        </AllStarShell>
      </div>
    </main>
  );
}
