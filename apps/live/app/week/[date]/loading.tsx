import "./chart-week-portal.css";

export default function ChartWeekPortalLoading() {
  return (
    <main className="chart-week-page">
      <div className="explorer explorer--loading" aria-busy="true" aria-label="Loading chart week">
        <header className="explorer__masthead">
          <h1 className="explorer__chart-name">Billboard Hot 100</h1>
          <p className="explorer__date">Loading chart week…</p>
        </header>
        <div>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="explorer-skeleton-row" />
          ))}
        </div>
      </div>
    </main>
  );
}
