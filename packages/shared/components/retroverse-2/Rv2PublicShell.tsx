import Link from "next/link";
import type { ReactNode } from "react";

import { ReturnToLiveLink } from "@/components/live-experience/ReturnToLiveLink";

import "./rv2-public-shell.css";

export type Rv2PublicShellProps = {
  children: ReactNode;
  /** Appended to `rv2-live` on `<main>` (e.g. `rv2-song`). */
  className?: string;
  /** Years nav destination. */
  yearsHref?: string;
  /** Charts nav destination. */
  chartsHref?: string;
  /** When set, marks the matching nav item as current page. */
  activeNav?: "live" | "search" | "years" | "charts";
  /** Renders inside `<main>` before chrome (e.g. live channel follower). */
  lead?: ReactNode;
  /** Controlled search field — used on `/search` (preserves live ?q= sync). */
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
  onSearchCommit?: () => void;
  /** Home-only mode: preserve shared search while omitting destination navigation. */
  minimalNavigation?: boolean;
  /** Broadcast frame for the Channel Zero home and Search shell. */
  broadcastChrome?: boolean;
};

export function Rv2PublicShell({
  children,
  className,
  lead,
  broadcastChrome = true,
}: Rv2PublicShellProps) {
  const mainClassName = [
    "rv2-live",
    broadcastChrome ? "rv2-live--broadcast-chrome" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className={mainClassName}>
      {lead}
      <div className="rv2-live__grid-glow" aria-hidden />

      {broadcastChrome ? (
        <header className="rv2-broadcast-banner rv2-broadcast-banner--top" aria-label="Retroverse live banner">
          <Link href="/" className="rv2-broadcast-banner__status">
            Retroverse Live
          </Link>
          <ReturnToLiveLink className="rv2-broadcast-banner__search" />
        </header>
      ) : null}

      <div className="rv2-public-shell__body">{children}</div>
      {broadcastChrome ? (
        <footer className="rv2-broadcast-banner rv2-broadcast-banner--bottom" aria-label="Broadcast updates">
          <Link href="/" className="rv2-broadcast-banner__action" aria-label="Scan a Retroverse Pass QR code to register">
            Scan Pass QR to Register
          </Link>
        </footer>
      ) : null}
    </main>
  );
}
