import { ArtistCover } from "@/app/artist/[slug]/artist-cover";

type Props = {
  rval: string;
  title: string;
  artistName: string;
  releaseYear: number | null;
  coverUrl: string | null;
};

export function AlbumHeroCover({ rval, title, artistName, releaseYear, coverUrl }: Props) {
  return (
    <ArtistCover
      src={coverUrl}
      alt=""
      className="album-ed__cover"
      fallbackClassName="album-ed__cover album-ed__cover--fallback"
      fallbackVariant="plate"
      placeholderContext={{
        rval,
        artist: artistName,
        album: title,
        releaseYear,
      }}
    />
  );
}
