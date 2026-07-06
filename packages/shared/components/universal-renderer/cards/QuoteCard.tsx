import type { QuoteCard } from "@/lib/universal-renderer/card-types";

type Props = { card: QuoteCard };

export function QuoteCard({ card }: Props) {
  return (
    <section className="urx__slide urx__slide--card urx__slide--quote">
      <p className="urx__kicker">In Their Words</p>
      <blockquote className="urx__quote">
        <p className="urx__quote-text">{card.quote}</p>
        <footer className="urx__quote-attribution">— {card.attribution}</footer>
      </blockquote>
    </section>
  );
}
