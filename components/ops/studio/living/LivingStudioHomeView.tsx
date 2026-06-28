import type { LivingStudioSnapshot } from "@/lib/ops/studio/living/types";
import {
  safeMetricCount,
  sumMetricCounts,
} from "@/lib/ops/studio/living/mission-control-format";

import { MissionControlActivityFeed } from "./mission-control/MissionControlActivityFeed";
import { MissionControlDepartmentRoom } from "./mission-control/MissionControlDepartmentRoom";
import { MissionControlHero } from "./mission-control/MissionControlHero";
import { MissionControlPrimaryActions } from "./mission-control/MissionControlPrimaryActions";
import { MissionControlProductionFlow } from "./mission-control/MissionControlProductionFlow";
import { MissionControlRecentPackages } from "./mission-control/MissionControlRecentPackages";
import { MissionControlStudioToday } from "./mission-control/MissionControlStudioToday";

type Props = {
  snapshot: LivingStudioSnapshot;
};

function productionQueueTotal(snapshot: LivingStudioSnapshot): number {
  return (snapshot.pipeline ?? [])
    .filter((node) => node.stage !== "published")
    .reduce((sum, node) => sum + safeMetricCount(node.count), 0);
}

function publishedCount(snapshot: LivingStudioSnapshot): number {
  return safeMetricCount(snapshot.pipeline?.find((n) => n.stage === "published")?.count);
}

function estimatedCompletion(snapshot: LivingStudioSnapshot, queueTotal: number): string {
  const producing = snapshot.departments.some((d) => d.mood === "working");
  if (producing) return "In progress now";
  if (queueTotal > 0) return "Start batch processing";
  return "Ready when you are";
}

export function LivingStudioHomeView({ snapshot }: Props) {
  const departments = snapshot.departments ?? [];

  const activeDepartment =
    departments.find((d) => d.mood === "working") ??
    departments.find((d) => d.currentProduction) ??
    null;

  const activeSong =
    activeDepartment?.currentProduction ?? snapshot.activeSong ?? null;

  const queueTotal = productionQueueTotal(snapshot);
  const songsWaiting = safeMetricCount(
    departments.find((d) => d.id === "collector")?.queueCount ?? queueTotal,
  );
  const currentQueue = sumMetricCounts(departments.map((d) => d.queueCount));
  const allEvents = departments
    .flatMap((d) => d.activityFeed ?? [])
    .filter((event, index, list) => list.findIndex((e) => e.id === event.id) === index);

  const packagesInProgress = departments.some((d) => d.mood === "working") ? 1 : 0;

  return (
    <div className="rs-mc">
      <MissionControlHero
        activeSong={activeSong}
        activeDepartment={activeDepartment}
        queueTotal={queueTotal}
      />

      <MissionControlPrimaryActions />

      <div className="rs-mc__main-grid">
        <MissionControlProductionFlow pipeline={snapshot.pipeline ?? []} />
        <MissionControlStudioToday
          packagesPublished={publishedCount(snapshot)}
          packagesInProgress={packagesInProgress}
          songsWaiting={songsWaiting}
          currentQueue={currentQueue}
          estimatedCompletion={estimatedCompletion(snapshot, queueTotal)}
        />
      </div>

      <section className="rs-mc-departments" aria-label="Studio departments">
        <h2 className="rs-mc-section-title">Enter a department</h2>
        <div className="rs-mc-departments__grid">
          {departments.map((dept) => (
            <MissionControlDepartmentRoom key={dept.id} department={dept} />
          ))}
        </div>
      </section>

      <MissionControlRecentPackages packages={snapshot.recentPublications ?? []} />

      <MissionControlActivityFeed events={allEvents} />
    </div>
  );
}
