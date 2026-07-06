import type { FactsCard } from "@/lib/universal-renderer/card-types";

type Props = { card: FactsCard };

export function FactsCard({ card }: Props) {
  return (
    <section className="urx__slide urx__slide--card urx__slide--facts">
      <p className="urx__kicker">Did You Know</p>
      <h2 className="urx__heading">Facts</h2>
      <ul className="urx__facts" role="list">
        {card.facts.map((fact, i) => (
          <li key={i} className="urx__fact">
            <span className="urx__fact-mark" aria-hidden="true">★</span>
            <span>{fact}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
