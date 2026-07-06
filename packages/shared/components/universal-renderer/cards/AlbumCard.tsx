import type { AlbumCard } from "@/lib/universal-renderer/card-types";

type Props = { card: AlbumCard };

export function AlbumCard({ card }: Props) {
  const initials = card.artist
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <section className="urx__slide urx__slide--card urx__slide--album">
      <p className="urx__kicker">Album</p>
      <div className="urx__album-artwork-wrap">
        {card.coverUrl ? (
          <img
            className="urx__album-artwork"
            src={card.coverUrl}
            alt={`${card.albumTitle} cover art`}
          />
        ) : (
          <div className="urx__album-artwork urx__album-artwork--placeholder">
            <span>{initials}</span>
          </div>
        )}
      </div>
      <h2 className="urx__heading urx__heading--album">{card.albumTitle}</h2>
      <p className="urx__album-artist">{card.artist}</p>
      {card.year ? <p className="urx__album-year">{card.year}</p> : null}
    </section>
  );
}
