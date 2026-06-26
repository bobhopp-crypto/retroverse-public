import type { AllStarDashboardStats } from "@/lib/ops/allstar/types";

type Props = {
  stats: AllStarDashboardStats;
  dataRoot: string;
  outputDir: string;
};

function StatCard(props: { label: string; value: number | string; note?: string }) {
  return (
    <article className="ops-allstar__stat">
      <p className="ops-allstar__stat-label">{props.label}</p>
      <p className="ops-allstar__stat-value">{props.value}</p>
      {props.note ? <p className="ops-allstar__stat-note">{props.note}</p> : null}
    </article>
  );
}

export function AllStarDashboardPanel({ stats, dataRoot, outputDir }: Props) {
  return (
    <>
      <section className="ops-allstar__section" aria-labelledby="allstar-stats">
        <h2 id="allstar-stats" className="ops-command__section-title">
          Pipeline Status
        </h2>
        <div className="ops-allstar__stats">
          <StatCard label="Total Scans" value={stats.totalScans} />
          <StatCard label="Processed" value={stats.processedScans} />
          <StatCard label="Pending" value={stats.pendingScans} />
          <StatCard
            label="OCR Complete"
            value={stats.ocrComplete}
            note={`${stats.ocrPartial} partial`}
          />
          <StatCard
            label="Geometry OK"
            value={stats.geometryOk}
            note={`${stats.geometryWarning} warnings`}
          />
        </div>
      </section>

      <section className="ops-allstar__section" aria-labelledby="allstar-paths">
        <h2 id="allstar-paths" className="ops-command__section-title">
          Data Paths
        </h2>
        <dl className="ops-allstar__paths">
          <div>
            <dt>Scans</dt>
            <dd>
              <code>{dataRoot}</code>
            </dd>
          </div>
          <div>
            <dt>Extractor output</dt>
            <dd>
              <code>{outputDir}</code>
            </dd>
          </div>
          <div>
            <dt>Last extraction</dt>
            <dd>{stats.lastExtractedAt ? new Date(stats.lastExtractedAt).toLocaleString() : "—"}</dd>
          </div>
        </dl>
      </section>
    </>
  );
}
