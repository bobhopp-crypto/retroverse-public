import type { Metadata } from "next";
import Link from "next/link";

import { ArchiveBrowseShell } from "@/app/components/archive-browse-shell";

export const metadata: Metadata = {
  title: "Albums — Retroverse",
  description: "Browse album exhibits in the Retroverse archive.",
};

const SAMPLE_ALBUMS = [
  { label: "Thriller", href: "/album/thriller" },
  { label: "Stand By Me", href: "/album/stand-by-me" },
] as const;

export default function BrowseAlbumsPage() {
  return (
    <ArchiveBrowseShell
      title="Albums"
      intro="Album exhibits open by title or RVAL id. Search is the fastest way in."
    >
      <p className="archive-browse__note">
        There is no full album catalog page yet. Search finds albums in the graph, then tap a result to open the exhibit.
      </p>
      <ul className="archive-browse__list">
        {SAMPLE_ALBUMS.map((item) => (
          <li key={item.href} className="archive-browse__item">
            <Link href={item.href} prefetch className="archive-browse__link">
              {item.label}
            </Link>
          </li>
        ))}
        <li className="archive-browse__item">
          <Link href="/charts" prefetch className="archive-browse__link">
            Chart history (albums by year)
          </Link>
        </li>
      </ul>
    </ArchiveBrowseShell>
  );
}
