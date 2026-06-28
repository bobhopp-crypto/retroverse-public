import Link from "next/link";
import type { ReactNode } from "react";

import { StudioGuideChrome } from "@/components/ops/studio/operator-guide";
import type { StudioGuidePageId } from "@/lib/ops/studio/operator-guide";
import type { StudioDepartmentId } from "@/lib/ops/studio/departments";

type NavKey = "dashboard" | StudioDepartmentId | "creative-review";

type Props = {
  active: NavKey;
  guidePage?: StudioGuidePageId;
  /** Dashboard-only hero title */
  title?: string;
  /** Department mission or dashboard subtitle */
  lead?: string;
  children: ReactNode;
};

const DEPARTMENTS: Array<{ key: NavKey; label: string; href: string }> = [
  { key: "collector", label: "Collector", href: "/ops/studio/collector" },
  { key: "editor", label: "Editor", href: "/ops/studio/editor" },
  { key: "director", label: "Director", href: "/ops/studio/director" },
  { key: "creative-review", label: "Creative Review", href: "/ops/studio/creative-review" },
  { key: "publisher", label: "Publisher", href: "/ops/studio/publisher" },
];

export function StudioShell({ active, guidePage, title, lead, children }: Props) {
  const showDashboardHero = active === "dashboard";
  const resolvedGuidePage: StudioGuidePageId = guidePage ?? (
    active === "dashboard" ? "dashboard" : active === "collector" || active === "editor" || active === "director" || active === "publisher"
      ? active
      : "dashboard"
  );

  return (
    <div className="ops-studio">
      <header className="ops-studio__rail" aria-label="Studio navigation">
        <Link
          href="/ops/studio"
          className={
            active === "dashboard"
              ? "ops-studio__rail-brand ops-studio__rail-brand--active"
              : "ops-studio__rail-brand"
          }
          aria-current={active === "dashboard" ? "page" : undefined}
        >
          Mission Control
        </Link>

        <nav className="ops-studio__nav" aria-label="Studio departments">
          <Link href="/ops/browser-plus-2" className="ops-studio__nav-link">
            Library &amp; Queue
          </Link>
          <Link
            href="/ops/studio/training"
            className={
              active === "dashboard" && title === "Training Mode"
                ? "ops-studio__nav-link ops-studio__nav-link--active"
                : "ops-studio__nav-link"
            }
          >
            Training
          </Link>
          {DEPARTMENTS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active === item.key ? "page" : undefined}
              className={
                active === item.key
                  ? "ops-studio__nav-link ops-studio__nav-link--active"
                  : "ops-studio__nav-link"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link className="ops-studio__back" href="/ops">
          Command Center
        </Link>
      </header>

      <StudioGuideChrome pageId={resolvedGuidePage} />

      {showDashboardHero && title ? (
        <div className="ops-studio__intro">
          <h1 className="ops-command__title">{title}</h1>
          {lead ? <p className="ops-command__lead">{lead}</p> : null}
        </div>
      ) : lead ? (
        <p className="ops-studio__mission">{lead}</p>
      ) : null}

      {children}
    </div>
  );
}
