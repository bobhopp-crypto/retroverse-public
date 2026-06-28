import { formatMetricCount } from "@/lib/ops/studio/living/mission-control-format";
import type { MissionControlDashboard } from "@/lib/ops/studio/production/load-mission-control-dashboard";

type Props = {
  dashboard: MissionControlDashboard;
};

function HealthBar({
  label,
  complete,
  total,
  ratio,
  publishedLabel,
}: {
  label: string;
  complete: number;
  total: number;
  ratio: number;
  publishedLabel?: boolean;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  return (
    <div className="rs-mc-health__row">
      <div className="rs-mc-health__row-head">
        <span className="rs-mc-health__label">{label}</span>
        <span className="rs-mc-health__count">
          {publishedLabel
            ? `${formatMetricCount(complete)} / ${formatMetricCount(total)}`
            : formatMetricCount(complete)}
        </span>
      </div>
      <div className="rs-mc-health__track" role="presentation">
        <div className="rs-mc-health__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function MissionControlProductionHealth({ dashboard }: Props) {
  const { counts, healthBars } = dashboard;
  const publishedBar = healthBars.find((b) => b.stage === "published");

  return (
    <section className="rs-mc-health" aria-label="Production health">
      <h2 className="rs-mc-section-title">Production Health</h2>

      <div className="rs-mc-health__bars">
        {healthBars
          .filter((b) => b.stage !== "published")
          .map((bar) => (
            <HealthBar
              key={bar.stage}
              label={bar.label}
              complete={bar.complete}
              total={bar.total}
              ratio={bar.ratio}
            />
          ))}
        {publishedBar ? (
          <HealthBar
            label="Published"
            complete={publishedBar.complete}
            total={publishedBar.total}
            ratio={publishedBar.ratio}
            publishedLabel
          />
        ) : null}
      </div>

      <dl className="rs-mc-health__stats">
        <div>
          <dt>Remaining</dt>
          <dd>{formatMetricCount(counts.backlogRemaining)}</dd>
        </div>
        <div>
          <dt>In pipeline</dt>
          <dd>{formatMetricCount(dashboard.backlogRun.enteredPipeline)}</dd>
        </div>
        <div>
          <dt>Needs editor</dt>
          <dd>{formatMetricCount(counts.needsEditor)}</dd>
        </div>
        <div>
          <dt>Failures</dt>
          <dd>{formatMetricCount(counts.failed)}</dd>
        </div>
      </dl>
    </section>
  );
}
