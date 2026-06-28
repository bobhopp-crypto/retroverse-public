import Link from "next/link";

import { DEPARTMENT_ROOM_COPY } from "@/lib/ops/studio/living/mission-control-copy";
import {
  formatMetricCount,
  safeMetricCount,
} from "@/lib/ops/studio/living/mission-control-format";
import { productionTrackerPath } from "@/lib/ops/studio/production-tracker/paths";
import type { LivingDepartmentSnapshot, LivingProductionCard } from "@/lib/ops/studio/living/types";

type Props = {
  activeSong: LivingProductionCard | null;
  activeDepartment: LivingDepartmentSnapshot | null;
  queueTotal?: number | null;
};

export function MissionControlHero({ activeSong, activeDepartment, queueTotal }: Props) {
  const safeQueueTotal = safeMetricCount(queueTotal);
  const isProducing = activeDepartment?.mood === "working" && activeSong;
  const hasQueue = safeQueueTotal > 0;

  let statusHeadline = "Studio Operating Normally";
  let statusDetail = "No song is in production right now. Start batch processing or open a department to begin.";

  if (isProducing && activeDepartment && activeSong) {
    statusHeadline = "Currently Producing";
    const verb = DEPARTMENT_ROOM_COPY[activeDepartment.id].workingVerb;
    statusDetail = `${activeDepartment.name} is ${verb} this song.`;
  } else if (hasQueue) {
    statusHeadline = "Work Waiting in Queue";
    statusDetail = `${formatMetricCount(safeQueueTotal)} songs are ready for the pipeline. Start batch processing to begin.`;
  }

  return (
    <section className="rs-mc-hero" aria-label="Studio status">
      <div className="rs-mc-hero__top">
        <p className="rs-mc-hero__kicker">Retroverse Studio</p>
        <h1 className="rs-mc-hero__title">Mission Control</h1>
        <p className={`rs-mc-hero__status rs-mc-hero__status--${isProducing ? "live" : hasQueue ? "queue" : "idle"}`}>
          {statusHeadline}
        </p>
        <p className="rs-mc-hero__detail">{statusDetail}</p>
      </div>

      {isProducing && activeSong ? (
        <div className="rs-mc-hero__production">
          <p className="rs-mc-hero__production-label">Currently working on</p>
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
