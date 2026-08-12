"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BOBOS_PRIMARY_NAV } from "@/lib/bobos/event-hub-nav";
import { getRvIdByNavId } from "@/lib/bobos/rv-ids";
import { RvIdLabel } from "@/components/bobos/rv-ids";

function isActive(pathname: string, href: string): boolean {
  if (href === "/bobos") return pathname === "/bobos";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BobosNav() {
  const pathname = usePathname();

  // BobOS Cockpit (home) + project dashboards hide this nav.
  // Legacy pages (Producer, Design Builder, etc.) keep it for wayfinding.
  if (
    pathname === "/bobos" ||
    pathname.startsWith("/bobos/project") ||
    pathname.startsWith("/bobos/broadcast")
  ) return null;

  return (
    <nav className="bobos-nav" aria-label="BobOS">
      <Link href="/bobos" className="bobos-nav__brand">
        BobOS
      </Link>
      <ul className="bobos-nav__list">
        {BOBOS_PRIMARY_NAV.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={`bobos-nav__link${isActive(pathname, item.href) ? " bobos-nav__link--active" : ""}`}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
            >
              <RvIdLabel rvId={getRvIdByNavId(item.id)} label={item.label} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
