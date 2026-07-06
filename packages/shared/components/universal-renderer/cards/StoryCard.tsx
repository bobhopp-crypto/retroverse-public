import type { StoryCard } from "@/lib/universal-renderer/card-types";

type Props = { card: StoryCard };

export function StoryCard({ card }: Props) {
  return (
    <section className="urx__slide urx__slide--card urx__slide--story">
      <p className="urx__kicker">{card.kicker}</p>
      <h2 className="urx__heading">{card.headline}</h2>
      <p className="urx__paragraph">{card.body}</p>
    </section>
  );
}
