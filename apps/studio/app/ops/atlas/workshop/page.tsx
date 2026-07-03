import { notFound } from "next/navigation";

import { AtlasFrame } from "@/components/atlas/AtlasFrame";
import { WorkshopBoard } from "@/components/atlas/WorkshopBoard";
import { loadAtlasRealities } from "@/lib/atlas/load-realities";
import { WORKSHOP_ROOMS } from "@/lib/atlas/workshop-rooms";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export default async function AtlasWorkshopPage() {
  if (!isOpsEnabled()) {
    notFound();
  }

  const realities = await loadAtlasRealities();

  return (
    <AtlasFrame active="workshop" realities={realities}>
      <WorkshopBoard rooms={WORKSHOP_ROOMS} />
    </AtlasFrame>
  );
}
