"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import "./atlas-legacy-nav.css";

const LEGACY_LINKS = [
  { href: "/ops/atlas/legacy", label: "Legacy Index" },
  { href: "/ops/atlas", label: "World Map" },
  { href: "/ops/atlas/1970s", label: "1970s Board" },
  { href: "/ops/atlas/workshop", label: "Workshop" },
  { href: "/ops/map", label: "Retroverse Map" },
] as const;

export function AtlasLegacyBanner() {
  return (
    <p className="atlas-legacy-banner" role="status">
      Legacy — hidden from main Atlas navigation. Preserved for reference only.
    </p>
  );
}

export function AtlasLegacyNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="atlas-legacy-nav" aria-label="Atlas legacy">
      <Link href="/ops/atlas/legacy" className="atlas-legacy-nav__brand" prefetch>
        Atlas Legacy
      </Link>
      <div className="atlas-legacy-nav__links">
        {LEGACY_LINKS.map((link) => {
          const active =
            link.href === "/ops/atlas"
              ? pathname === "/ops/atlas"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`atlas-legacy-nav__pill${active ? " atlas-legacy-nav__pill--active" : ""}`}
              prefetch
            >
              {link.label}
            </Link>
          );
        })}
      </div>
      <Link href="/ops/library" className="atlas-legacy-nav__back" prefetch={false}>
        Atlas Encyclopedia
      </Link>
    </nav>
  );
}
