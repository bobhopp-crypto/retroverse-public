import type { CreditsCard } from "@/lib/universal-renderer/card-types";

type Props = { card: CreditsCard };

export function CreditsCard({ card }: Props) {
  return (
    <section className="urx__slide urx__slide--card urx__slide--credits">
      <div className="urx__credits-body">
        <p className="urx__credits-brand">Retroverse</p>
        <h2 className="urx__credits-title">{card.title}</h2>
        <p className="urx__credits-artist">{card.artist}</p>
        {card.year ? <p className="urx__credits-year">{card.year}</p> : null}
        <p className="urx__credits-rvtr">{card.rvtr}</p>
      </div>
      <p className="urx__credits-tagline">Press Play for the Past.</p>
    </section>
  );
}
