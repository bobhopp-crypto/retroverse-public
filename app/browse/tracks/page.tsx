import type { Metadata } from "next";
import Link from "next/link";

import { ArchiveBrowseShell } from "@/app/components/archive-browse-shell";

export const metadata: Metadata = {
  title: "Tracks — Retroverse",
  description: "Browse song exhibits in the Retroverse archive.",
};

const SAMPLE_TRACKS = [
  { label: "Stand By Me", href: "/track/stand-by-me" },
  { label: "Thriller", href: "/track/thriller" },
] as const;

export default function BrowseTracksPage() {
  return (
    <ArchiveBrowseShell
      title="Tracks"
      intro="Song exhibits open by RVTR id or title slug. Search is the fastest way in."
    >
      <p className="archive-browse__note">
        There is no full track catalog page yet. Search finds recordings in the graph, then tap a result to open the exhibit.
      </p>
      <ul className="archive-browse__list">
        {SAMPLE_TRACKS.map((item) => (
          <li key={item.href} className="archive-browse__item">
            <Link href={item.href} prefetch className="archive-browse__link">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </ArchiveBrowseShell>
  );
}
