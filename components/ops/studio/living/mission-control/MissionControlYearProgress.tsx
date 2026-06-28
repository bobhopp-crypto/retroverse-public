import { formatMetricCount } from "@/lib/ops/studio/living/mission-control-format";
import type { EraPipelineCounts } from "@/lib/ops/studio/production/load-mission-control-dashboard";

type Props = {
  eras: EraPipelineCounts[];
};

export function MissionControlYearProgress({ eras }: Props) {
  if (!eras.length) return null;

  return (
    <section className="rs-mc-era" aria-label="Year progress">
      <h2 className="rs-mc-section-title">Sunday Night Progress</h2>
      <div className="rs-mc-era__grid">
        {eras.map((era) => (
          <div key={era.era} className="rs-mc-era__card">
            <h3 className="rs-mc-era__title">{era.era}s</h3>
            <dl className="rs-mc-era__stats">
              <div>
                <dt>Collector</dt>
                <dd>{formatMetricCount(era.collectorComplete)}</dd>
              </div>
              <div>
                <dt>Editor</dt>
                <dd>{formatMetricCount(era.editorComplete)}</dd>
              </div>
              <div>
                <dt>Director</dt>
                <dd>{formatMetricCount(era.directorComplete)}</dd>
              </div>
              <div>
                <dt>Published</dt>
                <dd>{formatMetricCount(era.published)}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
