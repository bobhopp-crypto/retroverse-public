import Link from "next/link";

type Props = {
  slug: string;
  title: string;
  displayName: string;
};

export function ArtistSectionPlaceholder({ slug, title, displayName }: Props) {
  return (
    <div className="artist-placeholder">
      <Link href={`/artist/${slug}`} className="artist-placeholder__back" prefetch>
        ← {displayName}
      </Link>
      <h2 className="artist-placeholder__title">{title}</h2>
      <p className="artist-placeholder__note">Full view coming soon.</p>
    </div>
  );
}
