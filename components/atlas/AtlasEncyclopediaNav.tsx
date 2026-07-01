"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import "./atlas-encyclopedia-nav.css";

const LINKS = [
  { href: "/ops/library", label: "Library" },
  { href: "/ops/atlas/scripts", label: "Script Launcher" },
  { href: "/ops/atlas/system", label: "System Map" },
  { href: "/ops/atlas/architecture", label: "Architecture" },
  { href: "/ops/atlas/legacy", label: "Legacy" },
] as const;

export function AtlasEncyclopediaNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="atlas-ency-nav" aria-label="Atlas encyclopedia">
      <Link href="/ops/library" className="atlas-ency-nav__brand" prefetch>
        Atlas
      </Link>
      <div className="atlas-ency-nav__links">
        {LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`atlas-ency-nav__pill${active ? " atlas-ency-nav__pill--active" : ""}`}
              prefetch
            >
              {link.label}
            </Link>
          );
        })}
      </div>
      <Link href="/ops" className="atlas-ency-nav__back" prefetch={false}>
        Command Center
      </Link>
    </nav>
  );
}
