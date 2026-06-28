import type { LivingStudioSnapshot } from "@/lib/ops/studio/living/types";

import { MissionControlCurrentActivity } from "./mission-control/MissionControlCurrentActivity";
import { MissionControlProductionHealth } from "./mission-control/MissionControlProductionHealth";
import { MissionControlRecentPackages } from "./mission-control/MissionControlRecentPackages";
import { MissionControlYearProgress } from "./mission-control/MissionControlYearProgress";

type Props = {
  snapshot: LivingStudioSnapshot;
};

export function LivingStudioHomeView({ snapshot }: Props) {
  const dashboard = snapshot.dashboard;
  const departments = snapshot.departments ?? [];

  const activeDepartment =
    departments.find((d) => d.mood === "working") ??
    departments.find((d) => d.currentProduction) ??
    null;

  const activeSong =
    activeDepartment?.currentProduction ?? snapshot.activeSong ?? null;

  if (!dashboard) return null;

  return (
    <div className="rs-mc">
      <MissionControlCurrentActivity
        dashboard={dashboard}
        activeSong={activeSong}
        activeDepartment={activeDepartment}
      />

      <MissionControlProductionHealth dashboard={dashboard} />

      <MissionControlYearProgress eras={dashboard.eraProgress} />

      <MissionControlRecentPackages packages={snapshot.recentPublications ?? []} />
    </div>
  );
}
