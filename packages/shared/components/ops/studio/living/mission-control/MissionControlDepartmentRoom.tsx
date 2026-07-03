import Link from "next/link";

import { DEPARTMENT_ROOM_COPY } from "@/lib/ops/studio/living/mission-control-copy";
import { formatMetricCount } from "@/lib/ops/studio/living/mission-control-format";
import { productionTrackerPath } from "@/lib/ops/studio/production-tracker/paths";
import type { LivingDepartmentSnapshot } from "@/lib/ops/studio/living/types";

type Props = {
  department: LivingDepartmentSnapshot;
};

export function MissionControlDepartmentRoom({ department }: Props) {
  const copy = DEPARTMENT_ROOM_COPY[department.id];
  const currentSong = department.currentProduction;

  return (
    <article className={`rs-mc-room rs-mc-room--${department.id}`}>
      <header className="rs-mc-room__head">
        <h3 className="rs-mc-room__name">{department.name}</h3>
        <p className="rs-mc-room__purpose">{copy.purpose}</p>
      </header>

      <dl className="rs-mc-room__stats">
        <div>
          <dt>Current Song</dt>
          <dd>
            {currentSong ? (
              <Link href={productionTrackerPath(currentSong.rvtr)} className="rs-mc-room__song-link">
                {currentSong.title}
              </Link>
            ) : (
              "None right now"
            )}
          </dd>
        </div>
        <div>
          <dt>Queue</dt>
          <dd>{formatMetricCount(department.queueCount)}</dd>
        </div>
        <div>
          <dt>Completed Today</dt>
          <dd>{formatMetricCount(department.completedToday)}</dd>
        </div>
      </dl>

      {department.mood === "working" ? (
        <p className="rs-mc-room__working">Currently working</p>
      ) : null}

      <Link href={department.href} className="rs-mc-room__cta">
        {copy.openLabel}
      </Link>
    </article>
  );
}
