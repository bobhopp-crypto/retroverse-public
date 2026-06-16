import { notFound } from "next/navigation";

import { AtlasFrame } from "@/components/atlas/AtlasFrame";
import { WorldMapBoard } from "@/components/atlas/WorldMapBoard";
import { loadAtlasRealities } from "@/lib/atlas/load-realities";
import {
  resolveAtlasCoverMap,
  TERRITORY_MISSION_RVTR,
} from "@/lib/atlas/resolve-covers";
import { WORLD_TERRITORIES } from "@/lib/atlas/world-map-data";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export default async function AtlasWorldPage() {
  if (!isOpsEnabled()) {
    notFound();
  }

  const rvtrs = Object.values(TERRITORY_MISSION_RVTR);
  const [realities, coverMap] = await Promise.all([
    loadAtlasRealities(),
    resolveAtlasCoverMap(rvtrs),
  ]);

  const coverByTerritoryId = Object.fromEntries(
    Object.entries(TERRITORY_MISSION_RVTR).map(([territoryId, rvtr]) => [
      territoryId,
      coverMap[rvtr] ?? null,
    ]),
  );

  return (
    <AtlasFrame active="world" realities={realities}>
      <WorldMapBoard territories={WORLD_TERRITORIES} coverByTerritoryId={coverByTerritoryId} />
    </AtlasFrame>
  );
}
