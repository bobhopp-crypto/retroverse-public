"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type AtlasRailActive = "world" | "1970s" | "workshop";

type Props = {
  active: AtlasRailActive;
};

const DECADES: { id: string; href: string | null; label: string }[] = [
  { id: "1950s", href: null, label: "50s" },
  { id: "1960s", href: null, label: "60s" },
  { id: "1970s", href: "/ops/atlas/1970s", label: "70s" },
  { id: "1980s", href: null, label: "80s" },
  { id: "1990s", href: null, label: "90s" },
  { id: "2000s", href: null, label: "00s" },
];

export function AtlasRail({ active }: Props) {
  const pathname = usePathname();

  return (
    <nav className="atlas-rail" aria-label="Performance Universe">
      <Link href="/ops/atlas" className="atlas-rail__brand" prefetch>
        Performance Universe
      </Link>
      <div className="atlas-rail__links">
        <Link
          href="/ops/atlas"
          className={`atlas-rail__pill${active === "world" ? " atlas-rail__pill--active" : ""}`}
          prefetch
        >
          World
        </Link>
        {DECADES.map((decade) =>
          decade.href ? (
            <Link
              key={decade.id}
              href={decade.href}
              className={`atlas-rail__pill${active === "1970s" && decade.id === "1970s" ? " atlas-rail__pill--active" : ""}`}
              prefetch
            >
              {decade.label}
            </Link>
          ) : (
            <span key={decade.id} className="atlas-rail__pill atlas-rail__pill--muted" title="Uncharted">
              {decade.label}
            </span>
          ),
        )}
        <Link href="/search" className="atlas-rail__pill" prefetch>
          Search
        </Link>
        <Link href="/sunday-nights" className="atlas-rail__pill" prefetch>
          Sunday Nights
        </Link>
        <Link
          href="/ops/atlas/workshop"
          className={`atlas-rail__pill${active === "workshop" || pathname === "/ops/atlas/workshop" ? " atlas-rail__pill--active" : ""}`}
          prefetch
        >
          Workshop
        </Link>
        <Link
          href="/ops/atlas/scripts"
          className={`atlas-rail__pill${pathname === "/ops/atlas/scripts" ? " atlas-rail__pill--active" : ""}`}
          prefetch
        >
          Script Launcher
        </Link>
        <Link
          href="/ops/atlas/system"
          className={`atlas-rail__pill${pathname === "/ops/atlas/system" ? " atlas-rail__pill--active" : ""}`}
          prefetch
        >
          System Map
        </Link>
      </div>
      <Link href="/ops" className="atlas-rail__back" prefetch={false}>
        Ops
      </Link>
    </nav>
  );
}
