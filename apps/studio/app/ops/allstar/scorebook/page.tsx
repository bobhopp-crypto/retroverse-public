import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AllStarScorebookPanel } from "@/components/ops/allstar/AllStarScorebookPanel";
import { AllStarShell } from "@/components/ops/allstar/AllStarShell";
import { loadArchiveRecords } from "@/lib/ops/allstar/build-live-archive";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../../ops.css";
import "../allstar.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scorebook",
  robots: { index: false, follow: false },
};

export default async function AllStarScorebookPage() {
  if (!isOpsEnabled()) notFound();

  const records = await loadArchiveRecords();
  const preservedPlayers = records
    .filter((r) => r.player.trim())
    .map((r) => ({ id: r.id, player: r.player, position: r.position }))
    .sort((a, b) => a.player.localeCompare(b.player));

  return (
    <main className="ops-page ops-command ops-allstar-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <AllStarShell
          active="scorebook"
          title="Bob League Scorebook"
          lead="Manual box score entry for physical games — draft, finalize, update season stats."
        >
          <AllStarScorebookPanel preservedPlayers={preservedPlayers} />
        </AllStarShell>
      </div>
    </main>
  );
}
