"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  adminMenuZones,
  detectAppZone,
  type AppZone,
  zoneHref,
} from "@/lib/navigation/app-zones";
import { detectPublicNavLink, PUBLIC_NAV_LINKS } from "@/lib/navigation/public-nav";

import "./retroverse-global-nav.css";

type Props = {
  opsEnabled: boolean;
  opsAuthenticated: boolean;
};

function GearIcon() {
  return (
    <svg
      className="rv-global-nav__gear-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .66.39 1.26 1 1.51H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function AdminGearMenu({
  opsEnabled,
  opsAuthenticated,
  activeZone,
}: {
  opsEnabled: boolean;
  opsAuthenticated: boolean;
  activeZone: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const zones = adminMenuZones(opsEnabled);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!opsEnabled || zones.length === 0) return null;

  return (
    <div className="rv-global-nav__gear-wrap" ref={rootRef}>
      <button
        type="button"
        className={
          opsAuthenticated
            ? "rv-global-nav__gear rv-global-nav__gear--authed"
            : "rv-global-nav__gear"
        }
        aria-label="Admin access"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <GearIcon />
      </button>

      {open ? (
        <div className="rv-global-nav__gear-menu" role="menu" aria-label="Admin navigation">
          <p className="rv-global-nav__gear-kicker">
            {opsAuthenticated ? "Admin access" : "Sign in required"}
          </p>
          {zones.map((zone: AppZone) => (
            <Link
              key={zone.id}
              href={zoneHref(zone, opsAuthenticated)}
              role="menuitem"
              className={
                activeZone === zone.id
                  ? "rv-global-nav__gear-item rv-global-nav__gear-item--active"
                  : "rv-global-nav__gear-item"
              }
              onClick={() => setOpen(false)}
            >
              <strong>{zone.label}</strong>
              <span>{zone.description}</span>
            </Link>
          ))}
          {!opsAuthenticated ? (
            <Link
              href="/internal/ops-pin?next=/ops"
              role="menuitem"
              className="rv-global-nav__gear-pin"
              onClick={() => setOpen(false)}
            >
              Enter PIN
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function RetroverseGlobalNav({ opsEnabled, opsAuthenticated }: Props) {
  const pathname = usePathname() ?? "/";
  const onGalleryRoute = pathname.startsWith("/retroverse/experiences");
  const activeZone = detectAppZone(pathname);
  const activePublicLink = detectPublicNavLink(pathname);

  useEffect(() => {
    if (!onGalleryRoute) return;
    console.log("[gallery-instrument] Mounted: RetroverseGlobalNav");
    return () => console.log("[gallery-instrument] Unmounted: RetroverseGlobalNav");
  }, [onGalleryRoute]);

  useEffect(() => {
    if (!onGalleryRoute) return;
    console.log("[gallery-instrument] Effect: RetroverseGlobalNav", { pathname });
  });

  return (
    <header className="rv-global-nav" aria-label="Retroverse application">
      <div className="rv-global-nav__inner">
        <Link href="/" className="rv-global-nav__home" aria-label="Retroverse home">
          Retroverse
        </Link>

        <nav className="rv-global-nav__zones" aria-label="Public navigation">
          {PUBLIC_NAV_LINKS.map((link) => {
            const isActive = activePublicLink === link.id;
            return (
              <Link
                key={link.id}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "rv-global-nav__zone rv-global-nav__zone--active"
                    : "rv-global-nav__zone"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <AdminGearMenu
          opsEnabled={opsEnabled}
          opsAuthenticated={opsAuthenticated}
          activeZone={activeZone}
        />
      </div>
    </header>
  );
}
