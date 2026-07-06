import type { LibraryStatsCard } from "@/lib/universal-renderer/card-types";

type Props = { card: LibraryStatsCard };

export function LibraryStatsCard({ card }: Props) {
  return (
    <section className="urx__slide urx__slide--card urx__slide--library-stats">
      <p className="urx__kicker">In The Library</p>
      <h2 className="urx__heading">Retroverse Stats</h2>
      <dl className="urx__stats">
        {card.playCount != null ? (
          <div className="urx__stat">
            <dt>Times Played</dt>
            <dd>{card.playCount.toLocaleString()}</dd>
          </div>
        ) : null}
        {card.peakHot100 != null ? (
          <div className="urx__stat">
            <dt>Hot 100 Peak</dt>
            <dd>#{card.peakHot100}</dd>
          </div>
        ) : null}
        {card.chartWeeks != null ? (
          <div className="urx__stat">
            <dt>Chart Weeks</dt>
            <dd>{card.chartWeeks}</dd>
          </div>
        ) : null}
        <div className="urx__stat">
          <dt>In DJ Library</dt>
          <dd>{card.hasVdjMedia ? "Yes" : "Not yet"}</dd>
        </div>
      </dl>
    </section>
  );
}
