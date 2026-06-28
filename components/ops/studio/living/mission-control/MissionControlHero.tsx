import Link from "next/link";

import { DEPARTMENT_ROOM_COPY } from "@/lib/ops/studio/living/mission-control-copy";
import {
  formatMetricCount,
  safeMetricCount,
} from "@/lib/ops/studio/living/mission-control-format";
import { productionTrackerPath } from "@/lib/ops/studio/production-tracker/paths";
import type { MissionControlDashboard } from "@/lib/ops/studio/production/load-mission-control-dashboard";
import type { LivingDepartmentSnapshot, LivingProductionCard } from "@/lib/ops/studio/living/types";

type Props = {
  dashboard: MissionControlDashboard;
  activeSong: LivingProductionCard | null;
  activeDepartment: LivingDepartmentSnapshot | null;
};

export function MissionControlHero({ dashboard, activeSong, activeDepartment }: Props) {
  const { counts, backlogRun, live } = dashboard;
  const isProducing = counts.currentlyProcessing > 0 && live.currentlyProcessing;
  const remaining = safeMetricCount(counts.backlogRemaining);

  let statusHeadline = "Factory Dashboard";
  let statusDetail = `${formatMetricCount(counts.published)} of ${formatMetricCount(counts.collectorComplete)} published · ${formatMetricCount(remaining)} remaining in backlog.`;

  if (isProducing && activeDepartment && activeSong) {
    statusHeadline = "Assembly Line Active";
    const verb = DEPARTMENT_ROOM_COPY[activeDepartment.id].workingVerb;
    statusDetail = `${activeDepartment.name} is ${verb} · ${backlogRun.throughputPerHour ?? "—"} songs/hr · ${formatMetricCount(counts.published)} / ${formatMetricCount(counts.collectorComplete)} published.`;
  } else if (remaining > 0 && backlogRun.enteredPipeline > 0) {
    statusHeadline = "Backlog Draining";
    statusDetail = `${formatMetricCount(backlogRun.enteredPipeline)} songs entered the pipeline · ${formatMetricCount(remaining)} still to publish.`;
  }

  return (
    <section className="rs-mc-hero" aria-label="Studio status">
      <div className="rs-mc-hero__top">
        <p className="rs-mc-hero__kicker">Retroverse Studio</p>
        <h1 className="rs-mc-hero__title">Mission Control</h1>
        <p className={`rs-mc-hero__status rs-mc-hero__status--${isProducing ? "live" : remaining > 0 ? "queue" : "idle"}`}>
          {statusHeadline}
        </p>
        <p className="rs-mc-hero__detail">{statusDetail}</p>
      </div>

      {isProducing && activeSong ? (
        <div className="rs-mc-hero__production">
          <p className="rs-mc-hero__production-label">Currently processing</p>
          <Link href={productionTrackerPath(activeSong.rvtr)} className="rs-mc-hero__song-card">
            {activeSong.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeSong.coverUrl} alt="" className="rs-mc-hero__art" />
            ) : (
              <div className="rs-mc-hero__art rs-mc-hero__art--fallback" aria-hidden>
                {activeSong.title.slice(0, 1)}
              </div>
            )}
            <div className="rs-mc-hero__song-text">
              <h2 className="rs-mc-hero__song-title">{activeSong.title}</h2>
              <p className="rs-mc-hero__song-artist">{activeSong.artist}</p>
              {activeDepartment ? (
                <p className="rs-mc-hero__song-dept">
                  {activeDepartment.name} · {DEPARTMENT_ROOM_COPY[activeDepartment.id].workingVerb}
                </p>
              ) : null}
            </div>
          </Link>
        </div>
      ) : null}
    </section>
  );
}
