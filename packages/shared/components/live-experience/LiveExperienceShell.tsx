import Link from "next/link";
import type { ReactNode } from "react";

import "./live-experience-shell.css";

export type LiveExperienceStatus = "Experience" | "Package" | "Track" | "Fallback";
export type LiveExperienceTab = "Story" | "Song" | "Chart" | "Artist" | "Live";

export type LiveExperienceAction = {
  label: LiveExperienceTab;
  href: string | null;
};

export type LiveExperienceIdentity = {
  rvtr: string | null;
  title: string;
  artist: string;
  year: number | null;
  peakHot100?: number | null;
};

type Props = {
  identity: LiveExperienceIdentity;
  status: LiveExperienceStatus;
  activeTab: LiveExperienceTab;
  actions: LiveExperienceAction[];
  primaryHref?: string | null;
  primaryLabel?: string;
  children: ReactNode;
};

function statusClass(status: LiveExperienceStatus): string {
  return status.toLowerCase();
}

function statusLabel(status: LiveExperienceStatus): string {
  if (status === "Fallback") return "Fallback";
  return status;
}

export function LiveExperienceShell({
  identity,
  status,
  activeTab,
  actions,
  primaryHref,
  primaryLabel,
  children,
}: Props) {
  return (
    <main className="live-shell">
      <header className="live-shell__header">
        <div>
          <Link href="/live" className="live-shell__brand">
            Retroverse
          </Link>
          <p className="live-shell__tagline">Press Play for the Past</p>
        </div>
        <Link href="/live" className="live-shell__back">
          Back to Live
        </Link>
      </header>

      <section className="live-shell__hero" aria-label="Current live song">
        <div className="live-shell__identity">
          <p className={`live-shell__status live-shell__status--${statusClass(status)}`}>
            {statusLabel(status)}
          </p>
          <h1>{identity.title}</h1>
          <p className="live-shell__artist">{identity.artist}</p>
          <p className="live-shell__meta">
            {identity.year ?? "Year unknown"}
            {identity.peakHot100 != null ? ` · Hot 100 #${identity.peakHot100}` : ""}
            {identity.rvtr ? ` · ${identity.rvtr}` : ""}
          </p>
        </div>

        {primaryHref ? (
          <Link href={primaryHref} className="live-shell__primary">
            {primaryLabel ?? "Open Live Destination"}
          </Link>
        ) : null}
      </section>

      <nav className="live-shell__tabs" aria-label="Live experience tabs">
        {actions.map((action) =>
          action.href ? (
            <Link
              key={action.label}
              href={action.href}
              className={action.label === activeTab ? "live-shell__tab live-shell__tab--active" : "live-shell__tab"}
            >
              {action.label}
            </Link>
          ) : (
            <span key={action.label} className="live-shell__tab live-shell__tab--disabled">
              {action.label}
            </span>
          ),
        )}
      </nav>

      <section className="live-shell__body">{children}</section>
    </main>
  );
}
