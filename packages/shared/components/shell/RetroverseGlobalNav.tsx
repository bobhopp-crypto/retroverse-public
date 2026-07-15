"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ReturnToLiveLink } from "@/components/live-experience/ReturnToLiveLink";
import { CANONICAL_AUDIENCE_HREF, isLiveBroadcastPath } from "@/lib/bobos/presentation/canonical-audience";
import {
  adminMenuZones,
  detectAppZone,
  type AppZone,
  zoneHref,
} from "@/lib/navigation/app-zones";
import {
  markCurrentInternalEntry,
  readCurrentInternalEntry,
  readStoredInternalEntry,
} from "@/lib/navigation/internal-history";

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

  if (!opsEnabled || !opsAuthenticated || zones.length === 0) return null;

  return (
    <div className="rv-global-nav__gear-wrap" ref={rootRef}>
      <button
        type="button"
        className="rv-global-nav__gear rv-global-nav__gear--authed"
        aria-label="Open BobOS settings"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <GearIcon />
        <span>BobOS</span>
      </button>

      {open ? (
        <div className="rv-global-nav__gear-menu" role="menu" aria-label="Admin navigation">
          <p className="rv-global-nav__gear-kicker">Owner settings</p>
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
        </div>
      ) : null}
    </div>
  );
}

export function RetroverseGlobalNav({ opsEnabled, opsAuthenticated }: Props) {
  const pathname = usePathname() ?? "/";
  const onGalleryRoute = pathname.startsWith("/retroverse/experiences");
  const activeZone = detectAppZone(pathname);
  const activeEntryIdRef = useRef<string | null>(null);
  const historyInitializedRef = useRef(false);

  useEffect(() => {
    const href = window.location.pathname;
    const current = readCurrentInternalEntry();

    if (current?.href === href) {
      const entry = markCurrentInternalEntry(href, current.previousId);
      activeEntryIdRef.current = entry.id;
      historyInitializedRef.current = true;
      return;
    }

    let previousId: string | null = null;
    if (historyInitializedRef.current) {
      previousId = activeEntryIdRef.current;
    } else {
      try {
        const referrer = document.referrer ? new URL(document.referrer) : null;
        if (referrer?.origin === window.location.origin) {
          previousId = readStoredInternalEntry()?.id ?? null;
        }
      } catch {
        previousId = null;
      }
    }

    const entry = markCurrentInternalEntry(href, previousId);
    activeEntryIdRef.current = entry.id;
    historyInitializedRef.current = true;
  }, [pathname]);

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
        <Link
          href={CANONICAL_AUDIENCE_HREF}
          className="rv-global-nav__home"
          aria-label="Retroverse public entry"
        >
          Retroverse
        </Link>

        <nav className="rv-global-nav__zones" aria-label="Public navigation">
          {!isLiveBroadcastPath(pathname) ? (
            <ReturnToLiveLink className="rv-global-nav__return-live" />
          ) : null}
          <Link
            href="/search"
            aria-current={pathname === "/search" ? "page" : undefined}
            className={
              pathname === "/search"
                ? "rv-global-nav__zone rv-global-nav__zone--active"
                : "rv-global-nav__zone"
            }
          >
            Search
          </Link>
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
