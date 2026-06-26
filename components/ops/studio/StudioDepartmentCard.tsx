import Link from "next/link";

import type { StudioDepartment } from "@/lib/ops/studio/departments";

type Props = {
  dept: StudioDepartment;
  disabled?: boolean;
};

export function StudioDepartmentCard({ dept, disabled }: Props) {
  const isDisabled = disabled ?? !dept.available;
  const { placeholders: p } = dept;

  return (
    <article
      className={
        isDisabled
          ? "ops-studio__dept-card ops-studio__dept-card--disabled"
          : "ops-studio__dept-card"
      }
    >
      <div className="ops-studio__dept-card-head">
        <span className="ops-studio__dept-icon" aria-hidden>
          {dept.icon}
        </span>
        <div>
          <h2 className="ops-studio__dept-name">{dept.name}</h2>
          <p className="ops-studio__dept-mission">{dept.mission}</p>
        </div>
        {isDisabled ? (
          <span className="ops-studio__badge ops-studio__badge--soon">Coming Soon</span>
        ) : null}
      </div>

      <dl className="ops-studio__stats ops-studio__stats--secondary">
        <div>
          <dt>Status</dt>
          <dd>{p.status === "Not Running" ? "Ready" : p.status}</dd>
        </div>
        <div>
          <dt>Queue</dt>
          <dd>{p.queue === 0 ? "Queue empty" : p.queue}</dd>
        </div>
        <div>
          <dt>Completed Today</dt>
          <dd>{p.completedToday === 0 ? "None yet today" : p.completedToday}</dd>
        </div>
      </dl>

      {isDisabled ? (
        <span className="ops-studio__dept-cta ops-studio__dept-cta--disabled">
          Coming Soon
        </span>
      ) : (
        <Link className="ops-studio__dept-cta" href={dept.href}>
          {dept.openLabel}
        </Link>
      )}
    </article>
  );
}
