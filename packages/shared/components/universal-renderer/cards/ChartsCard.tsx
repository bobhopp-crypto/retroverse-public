import type { ChartsCard } from "@/lib/universal-renderer/card-types";

type Props = { card: ChartsCard };

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

export function ChartsCard({ card }: Props) {
  const peakLabel =
    card.peakHot100 != null ? `#${card.peakHot100}` : card.entries[0]?.peak != null ? `#${card.entries[0].peak}` : null;

  return (
    <section className="urx__slide urx__slide--card urx__slide--charts">
      <p className="urx__kicker">Charts</p>
      <h2 className="urx__heading">By The Numbers</h2>

      <dl className="urx__stats">
        {peakLabel ? (
          <div className="urx__stat urx__stat--big">
            <dt>Peak Position</dt>
            <dd>{peakLabel}</dd>
          </div>
        ) : null}

        {card.chartWeeks != null ? (
          <div className="urx__stat">
            <dt>Weeks on Chart</dt>
            <dd>{card.chartWeeks}</dd>
          </div>
        ) : null}

        {card.year != null ? (
          <div className="urx__stat">
            <dt>Year</dt>
            <dd>{card.year}</dd>
          </div>
        ) : null}

        {card.albumTitle ? (
          <div className="urx__stat">
            <dt>Album</dt>
            <dd>{card.albumTitle}</dd>
          </div>
        ) : null}
      </dl>

      {card.entries.length > 1 ? (
        <div className="urx__chart-list">
          {card.entries.map((e, i) => (
            <div key={i} className="urx__chart-entry">
              <span className="urx__chart-name">{e.chart}</span>
              <span className="urx__chart-peak">
                {e.peak != null ? `#${e.peak}` : "—"}
                {e.weeks != null ? ` · ${e.weeks}w` : ""}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
