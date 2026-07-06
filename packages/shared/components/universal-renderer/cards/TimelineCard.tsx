import type { TimelineCard } from "@/lib/universal-renderer/card-types";

type Props = { card: TimelineCard };

export function TimelineCard({ card }: Props) {
  return (
    <section className="urx__slide urx__slide--card urx__slide--timeline">
      <p className="urx__kicker">Timeline</p>
      <h2 className="urx__heading">The Story</h2>
      <ol className="urx__timeline">
        {card.events.map((e, i) => (
          <li key={i} className="urx__timeline-item">
            {e.year ? <span className="urx__timeline-year">{e.year}</span> : null}
            <span className="urx__timeline-label">{e.title}</span>
            <span className="urx__timeline-desc">{e.description}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
