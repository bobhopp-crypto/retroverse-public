"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { artistSectionHref } from "@/lib/artist/routes";

type Props = { slug: string };

const MODES: { section: "" | "charts" | "library" | "explore"; label: string }[] = [
  { section: "", label: "Exhibit" },
  { section: "charts", label: "Charts" },
  { section: "library", label: "Library" },
  { section: "explore", label: "Explore" },
];

function isActive(pathname: string, base: string, section: string): boolean {
  if (section === "") return pathname === base;
  return pathname === `${base}/${section}` || pathname.startsWith(`${base}/${section}/`);
}

export function ArtistExhibitNav({ slug }: Props) {
  const pathname = usePathname();
  const base = `/artist/${slug}`;

  return (
    <nav className="artist-exhibit-nav" aria-label="Artist exhibit modes">
      {MODES.map(({ section, label }) => {
        const href = section === "" ? base : artistSectionHref(slug, section);
        const active = isActive(pathname, base, section);
        return (
          <Link
            key={section || "exhibit"}
            href={href}
            prefetch
            className="artist-exhibit-nav__pill"
            aria-current={active ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
