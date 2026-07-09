import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";

import "./chart-week-portal.css";

export default function ChartWeekPortalLoading() {
  return (
    <Rv2PublicShell className="rv2-chart-week rv2-explorer" activeNav="charts">
      <div className="explorer explorer--loading" aria-busy="true" aria-label="Loading chart week">
        <header className="explorer__header">
          <span className="explorer__back">← Back</span>
          <h1 className="explorer__date">Loading…</h1>
        </header>
        <div className="explorer__list">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="explorer-skeleton-row" />
          ))}
        </div>
      </div>
    </Rv2PublicShell>
  );
}
