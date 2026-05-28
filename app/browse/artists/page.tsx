import type { Metadata } from "next";
import Link from "next/link";

import { ArchiveBrowseShell } from "@/app/components/archive-browse-shell";
import { ARTIST_SLUGS } from "@/lib/artist/slug";

export const metadata: Metadata = {
  title: "Artists — Retroverse",
  description: "Browse artist exhibits in the Retroverse archive.",
};

export default function BrowseArtistsPage() {
  const entries = Object.entries(ARTIST_SLUGS).sort((a, b) =>
    a[1].localeCompare(b[1]),
  );

  return (
    <ArchiveBrowseShell
      title="Artists"
      intro="Open an artist exhibit, or search the archive for any name."
    >
      <ul className="archive-browse__list">
        {entries.map(([slug, name]) => (
          <li key={slug} className="archive-browse__item">
            <Link href={`/artist/${slug}`} prefetch className="archive-browse__link">
              {name}
            </Link>
          </li>
        ))}
      </ul>
      <p className="archive-browse__note">
        More artists appear when you search — the archive is larger than this starter list.
      </p>
    </ArchiveBrowseShell>
  );
}
