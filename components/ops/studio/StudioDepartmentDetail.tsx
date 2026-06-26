import Link from "next/link";

import type { StudioDepartment } from "@/lib/ops/studio/departments";

type Props = {
  dept: StudioDepartment;
};

export function StudioDepartmentDetail({ dept }: Props) {
  const { placeholders: p } = dept;
  const isDisabled = !dept.available;

  return (
    <div className="ops-studio-detail">
      {isDisabled ? (
        <p className="ops-studio__banner ops-studio__banner--soon">
          Coming Soon — this department is not yet available.
        </p>
      ) : null}

      <section className="ops-studio-detail__panel" aria-labelledby="studio-status">
        <h2 id="studio-status" className="ops-studio-detail__panel-title">
          Status
        </h2>
        <div className="ops-studio-detail__status">
          <span
            className={
              p.status === "Not Running"
                ? "ops-studio-detail__lamp ops-studio-detail__lamp--idle"
                : "ops-studio-detail__lamp ops-studio-detail__lamp--active"
            }
            aria-hidden
          />
          <p className="ops-studio-detail__status-text">
            {p.status === "Not Running" ? "Ready" : p.status}
          </p>
        </div>
      </section>

      <section className="ops-studio-detail__panel" aria-labelledby="studio-stats">
        <h2 id="studio-stats" className="ops-studio-detail__panel-title">
          Statistics
        </h2>
        <dl className="ops-studio__stats ops-studio__stats--detail">
          <div>
            <dt>Status</dt>
            <dd>{p.status}</dd>
          </div>
          <div>
            <dt>Current Job</dt>
            <dd>{p.currentJob}</dd>
          </div>
          <div>
            <dt>Queue</dt>
            <dd>{p.queue}</dd>
          </div>
          <div>
            <dt>Completed Today</dt>
            <dd>{p.completedToday}</dd>
          </div>
          <div>
            <dt>Average Time</dt>
            <dd>{p.averageTime}</dd>
          </div>
          <div>
            <dt>Coverage</dt>
            <dd>{p.coverage}</dd>
          </div>
        </dl>
      </section>

      <div className="ops-studio-detail__grid">
        <section className="ops-studio-detail__panel" aria-labelledby="studio-current">
          <h2 id="studio-current" className="ops-studio-detail__panel-title">
            Current Work
          </h2>
          <p className="ops-studio-detail__empty">Waiting for work.</p>
        </section>

        <section className="ops-studio-detail__panel" aria-labelledby="studio-recent">
          <h2 id="studio-recent" className="ops-studio-detail__panel-title">
            Recent Work
          </h2>
          <p className="ops-studio-detail__empty">No completed work yet.</p>
        </section>

        <section className="ops-studio-detail__panel" aria-labelledby="studio-queue">
          <h2 id="studio-queue" className="ops-studio-detail__panel-title">
            Queue
          </h2>
          <p className="ops-studio-detail__queue-count">{p.queue === 0 ? "0" : p.queue}</p>
          <p className="ops-studio-detail__empty">
            {p.queue === 0 ? "Queue empty" : "Items waiting"}
          </p>
        </section>

        <section className="ops-studio-detail__panel" aria-labelledby="studio-timeline">
          <h2 id="studio-timeline" className="ops-studio-detail__panel-title">
            Activity Timeline
          </h2>
          <ol className="ops-studio-detail__timeline">
            <li>
              <time dateTime="today">Today</time>
              <span>Department opened</span>
            </li>
          </ol>
        </section>
      </div>

      <p className="ops-studio-detail__back-row">
        <Link className="ops-studio__back" href="/ops/studio">
          ← Studio
        </Link>
      </p>
    </div>
  );
}
