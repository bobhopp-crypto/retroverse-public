import Link from "next/link";

import "./artist-page.css";

type Props = {
  slug: string;
  title: string;
  displayName: string;
};

export function ArtistSectionPlaceholder({ slug, title, displayName }: Props) {
  const name = displayName;

  return (
    <div className="artist-exhibit">
      <div className="artist-placeholder">
        <Link href={`/artist/${slug}`} className="artist-placeholder__back">
          ← {name}
        </Link>
        <h1 className="artist-placeholder__title">{title}</h1>
        <p className="artist-placeholder__note">Full view coming soon.</p>
      </div>
    </div>
  );
}
