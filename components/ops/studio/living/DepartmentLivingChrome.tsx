import type { ReactNode } from "react";
import Link from "next/link";

import type { LivingDepartmentSnapshot } from "@/lib/ops/studio/living/types";

import { ActivityTimeline } from "./ActivityTimeline";
import { ProductionFilmStrip } from "./ProductionFilmStrip";

type Props = {
  department: LivingDepartmentSnapshot;
  children?: ReactNode;
};

export function DepartmentLivingChrome({ department, children }: Props) {
  const { mood, currentProduction, emptyMessage } = department;

  return (
    <div className="rs-living-dept">
      <header className={`rs-living-dept__head rs-living-dept__head--${department.id}`}>
        <div className="rs-living-dept__intro">
          <p className="rs-living-dept__atmosphere">{department.atmosphere}</p>
          <h1 className="rs-living-dept__name">{department.name}</h1>
          <p className={`rs-living-dept__activity rs-living-dept__activity--${mood}`}>
            {mood === "idle" && !currentProduction ? emptyMessage : department.currentActivity}
          </p>
        </div>
        <dl className="rs-living-dept__stats">
          <div>
            <dt>Queue</dt>
            <dd>{department.queueCount}</dd>
          </div>
          <div>
            <dt>Completed</dt>
            <dd>{department.completedToday}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd className={`rs-living-dept__mood rs-living-dept__mood--${mood}`}>{mood}</dd>
          </div>
        </dl>
      </header>

      <section className="rs-living-dept__current">
        <h2 className="rs-living-dept__section-title">Current production</h2>
        {currentProduction ? (
          <Link href={currentProduction.href} className="rs-living-dept__production-card">
            <div className="rs-living-dept__production-art">
              {currentProduction.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentProduction.coverUrl} alt="" />
              ) : (
                <span>{currentProduction.title.slice(0, 1)}</span>
              )}
            </div>
            <div>
              <p className="rs-living-dept__production-artist">{currentProduction.artist}</p>
              <h3 className="rs-living-dept__production-title">{currentProduction.title}</h3>
              {currentProduction.subtitle ? (
                <p className="rs-living-dept__production-sub">{currentProduction.subtitle}</p>
              ) : null}
            </div>
          </Link>
        ) : (
          <p className="rs-living-dept__empty">{emptyMessage}</p>
        )}
      </section>

      <div className="rs-living-dept__grid">
        <ProductionFilmStrip
          productions={department.recentProductions}
          title="Recent"
          emptyMessage="Completed work will appear here."
        />
        <ActivityTimeline events={department.activityFeed} title="Timeline" />
      </div>

      {children}
    </div>
  );
}
