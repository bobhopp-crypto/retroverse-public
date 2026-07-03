import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AtlasFrame } from "@/components/atlas/AtlasFrame";
import { MissionCardClient } from "@/components/atlas/MissionCardClient";
import { loadAtlasRealities } from "@/lib/atlas/load-realities";
import { loadMissionWorkspace } from "@/lib/atlas/load-mission";
import { resolveAtlasCoverMap } from "@/lib/atlas/resolve-covers";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ rvtr: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rvtr } = await params;
  const workspace = await loadMissionWorkspace(rvtr);
  if (!workspace) {
    return { title: "Mission — Retroverse Atlas" };
  }
  return {
    title: `${workspace.title} — ${workspace.verb} Mission — Atlas`,
    robots: { index: false, follow: false },
  };
}

export default async function AtlasMissionPage({ params }: Props) {
  if (!isOpsEnabled()) {
    notFound();
  }

  const { rvtr } = await params;
  const workspace = await loadMissionWorkspace(rvtr);
  if (!workspace) {
    notFound();
  }

  const relatedRvtrs = workspace.relatedByArtist.map((r) => r.rvtr);
  const allRvtrs = [workspace.rvtr, ...relatedRvtrs];

  const [realities, coverMap] = await Promise.all([
    loadAtlasRealities(),
    resolveAtlasCoverMap(allRvtrs),
  ]);

  return (
    <AtlasFrame active="1970s" realities={realities}>
      <MissionCardClient
        initialWorkspace={workspace}
        initialCoverUrl={coverMap[workspace.rvtr] ?? null}
        relatedCovers={coverMap}
      />
    </AtlasFrame>
  );
}
