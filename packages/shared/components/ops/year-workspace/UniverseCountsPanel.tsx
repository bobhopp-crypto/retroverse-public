import type { ReviewUniverseUniverses } from "@/lib/ops/load-review-universe";

export function UniverseCountsPanel(props: {
  year: number;
  universes: ReviewUniverseUniverses;
}) {
  const u = props.universes;
  return (
    <section className="ops-ru-universes" aria-label="Universe counts">
      <article className="ops-ru-universes__card ops-ru-universes__card--video">
        <h3 className="ops-ru-universes__label">A · Video Universe</h3>
        <p className="ops-ru-universes__value">{u.video}</p>
        <p className="ops-ru-universes__hint">VDJ performance videos · primary table</p>
      </article>
      <article className="ops-ru-universes__card ops-ru-universes__card--chart">
        <h3 className="ops-ru-universes__label">B · Chart Universe</h3>
        <p className="ops-ru-universes__value">{u.chart}</p>
        <p className="ops-ru-universes__hint">
          Hot 100 tracks in {props.year} · not listed in table
        </p>
      </article>
      <article className="ops-ru-universes__card ops-ru-universes__card--linked">
        <h3 className="ops-ru-universes__label">C · Linked Universe</h3>
        <p className="ops-ru-universes__value">{u.linked}</p>
        <p className="ops-ru-universes__hint">
          Videos with graph chart link · fixtures preserved {u.regressionMatched}
          {props.year === 1967 ? " / 21" : ""}
        </p>
      </article>
    </section>
  );
}
