import { notFound } from "next/navigation";

import { AtlasFrame } from "@/components/atlas/AtlasFrame";
import { Territory1970sBoard } from "@/components/atlas/Territory1970sBoard";
import { load1970sAudit } from "@/lib/atlas/load-1970s-audit";
import { loadAtlasRealities } from "@/lib/atlas/load-realities";
import { resolveAtlasCoverMap } from "@/lib/atlas/resolve-covers";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export default async function Atlas1970sPage() {
  if (!isOpsEnabled()) {
    notFound();
  }

  const data = await load1970sAudit();
  const rvtrs = data.missions.map((m) => m.rvtr);
  const [realities, coverByRvtr] = await Promise.all([
    loadAtlasRealities(),
    resolveAtlasCoverMap(rvtrs),
  ]);

  return (
    <AtlasFrame active="1970s" realities={realities}>
      <Territory1970sBoard data={data} coverByRvtr={coverByRvtr} />
    </AtlasFrame>
  );
}
