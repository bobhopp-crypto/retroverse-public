import Link from "next/link";

import { DEPARTMENT_ROOM_COPY } from "@/lib/ops/studio/living/mission-control-copy";
import { formatMetricCount } from "@/lib/ops/studio/living/mission-control-format";
import { productionTrackerPath } from "@/lib/ops/studio/production-tracker/paths";
import type { MissionControlDashboard } from "@/lib/ops/studio/production/load-mission-control-dashboard";
import type { LivingDepartmentSnapshot, LivingProductionCard } from "@/lib/ops/studio/living/types";

type Props = {
  dashboard: MissionControlDashboard;
  activeSong: LivingProductionCard | null;
  activeDepartment: LivingDepartmentSnapshot | null;
};

export function MissionControlCurrentActivity({
  dashboard,
  activeSong,
  activeDepartment,
}: Props) {
  const { counts, backlogRun, live } = dashboard;
  const isRunning = counts.currentlyProcessing > 0 && live.currentlyProcessing;
  const statusTone = isRunning ? "live" : counts.backlogRemaining > 0 ? "queue" : "idle";

  let statusLabel = "Factory Idle";
  if (isRunning) statusLabel = "Factory Running";
  else if (counts.backlogRemaining > 0 && backlogRun.enteredPipeline > 0) statusLabel = "Backlog Draining";

  const processingSong = live.currentlyProcessing ?? activeSong;
  const processingDept = live.processingDepartment ?? activeDepartment?.id ?? null;

  return (
    <section className="rs-mc-current" aria-label="Current activity">
      <h2 className="rs-mc-section-title">Current Activity</h2>

      <div className="rs-mc-current__head">
        <p className={`rs-mc-current__status rs-mc-current__status--${statusTone}`}>{statusLabel}</p>
        <p className="rs-mc-current__published">
          <strong>{formatMetricCount(counts.published)}</strong>
          <span> published of {formatMetricCount(counts.collectorComplete)}</span>
        </p>
      </div>

      {isRunning && processingSong && processingDept ? (
        <Link href={productionTrackerPath(processingSong.rvtr)} className="rs-mc-current__now">
          <span className="rs-mc-current__now-label">Processing now</span>
          <span className="rs-mc-current__now-title">
            {processingSong.artist} — {processingSong.title}
          </span>
          <span className="rs-mc-current__now-meta">
            {processingSong.rvtr} · {processingDept} ·{" "}
            {DEPARTMENT_ROOM_COPY[processingDept].workingVerb}
          </span>
        </Link>
      ) : (
        <p className="rs-mc-current__idle">No song is processing right now.</p>
      )}

      <dl className="rs-mc-current__meta">
        {live.nextInQueue && !isRunning ? (
          <div>
            <dt>Next</dt>
            <dd>
              {live.nextInQueue.artist} — {live.nextInQueue.title} ({live.nextInQueue.rvtr})
            </dd>
          </div>
        ) : null}
        {live.lastPublished ? (
          <div>
            <dt>Last published</dt>
            <dd>
              {live.lastPublished.artist} — {live.lastPublished.title} ({live.lastPublished.rvtr})
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Throughput</dt>
          <dd>{backlogRun.throughputPerHour != null ? `${backlogRun.throughputPerHour} songs/hr` : "—"}</dd>
        </div>
      </dl>
    </section>
  );
}
