import type { PipelineHealthSnapshot } from "@/lib/ops/studio/pipeline-snapshot-types";

type Props = {
  health: PipelineHealthSnapshot | null | undefined;
};

function DeptRow({
  name,
  counts,
}: {
  name: string;
  counts: { running: number; waiting: number; complete: number };
}) {
  return (
    <div className="rs-pipeline-diag__dept">
      <h3 className="rs-pipeline-diag__dept-name">{name}</h3>
      <dl className="rs-pipeline-diag__stats">
        <div>
          <dt>Running</dt>
          <dd>{counts.running}</dd>
        </div>
        <div>
          <dt>Waiting</dt>
          <dd>{counts.waiting}</dd>
        </div>
        <div>
          <dt>Complete</dt>
          <dd>{counts.complete}</dd>
        </div>
      </dl>
    </div>
  );
}

export function PipelineDiagnosticsPanel({ health }: Props) {
  if (!health?.collector) {
    return (
      <section className="rs-pipeline-diag rs-studio-panel" aria-label="Pipeline diagnostics">
        <h2 className="rs-studio-panel-title">Pipeline diagnostics</h2>
        <p className="rs-pipeline-diag__loading">Loading pipeline counts…</p>
      </section>
    );
  }

  return (
    <section className="rs-pipeline-diag rs-studio-panel" aria-label="Pipeline diagnostics">
      <h2 className="rs-studio-panel-title">Pipeline diagnostics</h2>
      <div className="rs-pipeline-diag__grid">
        <DeptRow name="Collector" counts={health.collector} />
        <DeptRow name="Editor" counts={health.editor} />
        <DeptRow name="Director" counts={health.director} />
        <DeptRow name="Publisher" counts={health.publisher} />
      </div>
      <div className="rs-pipeline-diag__published">
        <span className="rs-pipeline-diag__published-label">Published</span>
        <strong className="rs-pipeline-diag__published-total">{health.publishedTotal}</strong>
      </div>
      {(health.stuckEditorSubmittedNoDirector > 0 ||
        health.stuckEditorReadyNotSubmitted > 0 ||
        health.stuckDirectorNoPublisher > 0) && (
        <ul className="rs-pipeline-diag__stuck">
          {health.stuckEditorReadyNotSubmitted > 0 ? (
            <li key="stuck-editor-handoff">
              Editor waiting handoff: <strong>{health.stuckEditorReadyNotSubmitted}</strong>
            </li>
          ) : null}
          {health.stuckEditorSubmittedNoDirector > 0 ? (
            <li key="stuck-director-backlog">
              Director queue backlog: <strong>{health.stuckEditorSubmittedNoDirector}</strong>
            </li>
          ) : null}
          {health.stuckDirectorNoPublisher > 0 ? (
            <li key="stuck-publisher-backlog">
              Publisher queue backlog: <strong>{health.stuckDirectorNoPublisher}</strong>
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}
