import {
  formatMetricCount,
  formatMetricText,
} from "@/lib/ops/studio/living/mission-control-format";
import type { MissionControlDashboard } from "@/lib/ops/studio/production/load-mission-control-dashboard";

type Props = {
  dashboard: MissionControlDashboard;
};

export function MissionControlStudioToday({ dashboard }: Props) {
  const { counts, backlogRun } = dashboard;

  const metrics = [
    { label: "Published", value: formatMetricCount(counts.published) },
    { label: "Needs Editor", value: formatMetricCount(counts.needsEditor) },
    { label: "Needs Director", value: formatMetricCount(counts.needsDirector) },
    { label: "Needs Creative Review", value: formatMetricCount(counts.needsCreativeReview) },
    { label: "Needs Publisher", value: formatMetricCount(counts.needsPublisher) },
    { label: "Entered Pipeline", value: formatMetricCount(backlogRun.enteredPipeline) },
    { label: "Failed", value: formatMetricCount(counts.failed) },
    {
      label: "Est. Completion",
      value: formatMetricText(
        backlogRun.estimatedCompletionAt
          ? new Date(backlogRun.estimatedCompletionAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })
          : backlogRun.estimatedCompletionAt === "Complete"
            ? "Complete"
            : null,
        "—",
      ),
      text: true,
    },
  ];

  return (
    <section className="rs-mc-today" aria-label="Pipeline counts">
      <h2 className="rs-mc-section-title">Pipeline Counts</h2>
      <dl className="rs-mc-today__grid">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={metric.text ? "rs-mc-today__metric rs-mc-today__metric--text" : "rs-mc-today__metric"}
          >
            <dt>{metric.label}</dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
