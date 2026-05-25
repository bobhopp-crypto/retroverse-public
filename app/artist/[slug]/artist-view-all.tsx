import Link from "next/link";

type Props = {
  href: string;
  /** Light text on dark sections (album shelf) */
  variant?: "light" | "dark";
};

export function ArtistViewAll({ href, variant = "dark" }: Props) {
  return (
    <Link href={href} prefetch className={`artist-view-all artist-view-all--${variant}`}>
      View All →
    </Link>
  );
}
