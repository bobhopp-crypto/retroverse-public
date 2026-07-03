import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AllStarPlayerPanel } from "@/components/ops/allstar/AllStarPlayerPanel";
import { AllStarShell } from "@/components/ops/allstar/AllStarShell";
import { loadPlayerIntelligence } from "@/lib/ops/allstar/intelligence/load-intelligence";
import { loadPlayerLeagueProfile } from "@/lib/ops/allstar/league/game-engine";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../../../ops.css";
import "../../allstar.css";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = await loadPlayerIntelligence(id);
  return {
    title: profile ? `${profile.record.fullName} — Player Intelligence` : "Player Intelligence",
    robots: { index: false, follow: false },
  };
}

export default async function AllStarPlayerPage({ params }: Props) {
  if (!isOpsEnabled()) notFound();

  const { id } = await params;
  const profile = await loadPlayerIntelligence(id);
  if (!profile) notFound();

  const league = await loadPlayerLeagueProfile(id);

  return (
    <main className="ops-page ops-command ops-allstar-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <AllStarShell
          active="player"
          title={profile.record.fullName}
          lead={`${profile.record.position} · Cadaco accuracy ${profile.comparison.accuracyScore} · ${profile.comparison.accuracyLabel}`}
        >
          <AllStarPlayerPanel profile={profile} league={league} />
        </AllStarShell>
      </div>
    </main>
  );
}
