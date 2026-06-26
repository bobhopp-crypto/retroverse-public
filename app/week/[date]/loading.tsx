import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";

import "./chart-week-portal.css";

export default function ChartWeekPortalLoading() {
  return (
    <Rv2PublicShell className="rv2-chart-week" activeNav="charts">
      <div className="chart-week-portal" aria-busy="true" aria-label="Loading chart week">
        <section className="chart-week-portal-hero">
          <p className="chart-week-portal-hero__eyebrow">Billboard Hot 100</p>
          <h1 className="chart-week-portal-hero__title">…</h1>
          <p className="chart-week-portal-hero__lead">Opening chart week…</p>
        </section>
      </div>
    </Rv2PublicShell>
  );
}
