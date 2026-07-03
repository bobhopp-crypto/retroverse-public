import {
  albumPlaceholderStyle,
  computeAlbumPlaceholderVariant,
  type AlbumPlaceholderContext,
} from "@/lib/artwork/album-placeholder-variant";

type Props = {
  context: AlbumPlaceholderContext;
  className?: string;
  /** Smaller type for search thumbs and shelf tiles */
  density?: "default" | "compact" | "dense";
};

function displayArtist(artist: string): string {
  return artist.trim().toUpperCase() || "UNKNOWN ARTIST";
}

function displayAlbum(album: string | null | undefined, fallback: string): string {
  const a = (album ?? fallback).trim();
  return a || "Untitled";
}

export function ArchiveCoverPlate({
  context,
  className = "",
  density = "default",
}: Props) {
  const variant = computeAlbumPlaceholderVariant(context);
  const style = albumPlaceholderStyle(context);
  const artist = displayArtist(context.artist);
  const album = displayAlbum(context.album, artist);
  const year =
    context.releaseYear != null && context.releaseYear > 0
      ? String(context.releaseYear)
      : null;
  const rval = context.rval?.trim().toUpperCase() || null;

  return (
    <div
      className={`archive-cover-plate archive-cover-plate--${density} cover-fallback--variant ${className}`.trim()}
      style={style}
      data-ph-era={variant.era}
      data-ph-compilation={variant.isCompilation ? "1" : undefined}
      aria-hidden
    >
      <div className="archive-cover-plate__frame">
        <p className="archive-cover-plate__artist">{artist}</p>
        <p className="archive-cover-plate__album">{album}</p>
        {year ? <p className="archive-cover-plate__year">{year}</p> : null}
        {rval ? <p className="archive-cover-plate__rval">{rval}</p> : null}
        <p className="archive-cover-plate__stamp">NO COVER</p>
      </div>
    </div>
  );
}
