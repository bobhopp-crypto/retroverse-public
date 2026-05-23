import Link from "next/link";

/** Generic search — RV History entry (no year context). */
export function SearchRvHistoryEntryPanel() {
  return (
    <section
      className="search-charts-history search-rv-history-entry"
      data-charts-ui="rv-history-entry"
      aria-labelledby="search-rv-history-entry-heading"
    >
      <div className="search-charts-history__header">
        <h2 id="search-rv-history-entry-heading" className="search-charts-history__title">
          RV HISTORY
        </h2>
      </div>

      <div className="search-rv-history-entry__body">
        <p className="search-rv-history-entry__message">
          Explore RV Rankings by year, month, or chart week.
        </p>
        <Link className="search-rv-history-entry__cta" href="/charts">
          EXPLORE CHARTS
        </Link>
      </div>
    </section>
  );
}
