import {
  formatMetricCount,
  formatMetricText,
} from "@/lib/ops/studio/living/mission-control-format";

type Props = {
  packagesPublished?: number | null;
  packagesInProgress?: number | null;
  songsWaiting?: number | null;
  currentQueue?: number | null;
  estimatedCompletion?: string | null;
};

export function MissionControlStudioToday({
  packagesPublished,
  packagesInProgress,
  songsWaiting,
  currentQueue,
  estimatedCompletion,
}: Props) {
  const metrics = [
    { label: "Packages Published", value: formatMetricCount(packagesPublished) },
    { label: "Packages In Progress", value: formatMetricCount(packagesInProgress) },
    { label: "Songs Waiting", value: formatMetricCount(songsWaiting) },
    { label: "Current Queue", value: formatMetricCount(currentQueue) },
    {
      label: "Estimated Completion",
      value: formatMetricText(estimatedCompletion, "—"),
      text: true,
    },
  ];

  return (
    <section className="rs-mc-today" aria-label="Studio today">
      <h2 className="rs-mc-section-title">Studio Today</h2>
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
