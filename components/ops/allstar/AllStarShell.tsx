import Link from "next/link";
import type { ReactNode } from "react";

import type { AllStarModuleInfo } from "@/lib/ops/allstar/types";

type NavKey = "dashboard" | "preserve" | "review" | "audit" | "scorebook" | "seasons" | "stats" | "library" | "explorer" | "research" | "binder" | "player" | "analysis";

type Props = {
  active: NavKey;
  title: string;
  lead?: string;
  modules?: AllStarModuleInfo[];
  children: ReactNode;
};

const NAV: Array<{ key: NavKey; label: string; href: string }> = [
  { key: "dashboard", label: "Living Archive", href: "/ops/allstar" },
  { key: "scorebook", label: "Scorebook", href: "/ops/allstar/scorebook" },
  { key: "seasons", label: "Seasons", href: "/ops/allstar/seasons" },
  { key: "stats", label: "Stats", href: "/ops/allstar/stats" },
  { key: "preserve", label: "Preserve", href: "/ops/allstar/preserve" },
  { key: "review", label: "Review", href: "/ops/allstar/review" },
  { key: "audit", label: "Audit", href: "/ops/allstar/audit" },
  { key: "library", label: "Disc Library", href: "/ops/allstar/library" },
  { key: "explorer", label: "Explorer", href: "/ops/allstar/explorer" },
  { key: "research", label: "Research", href: "/ops/allstar/research" },
  { key: "binder", label: "Binder", href: "/ops/allstar/binder" },
];

export function AllStarShell({ active, title, lead, modules, children }: Props) {
  return (
    <div className="ops-allstar">
      <header className="ops-allstar__head">
        <div>
          <p className="ops-command__kicker">All-Star Baseball · Living Archive</p>
          <h1 className="ops-command__title">{title}</h1>
          {lead ? <p className="ops-command__lead">{lead}</p> : null}
        </div>
        <Link className="ops-allstar__back" href="/ops">
          Command Center
        </Link>
      </header>

      <nav className="ops-allstar__nav" aria-label="All-Star Baseball">
        {NAV.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active === item.key ? "page" : undefined}
            className={
              active === item.key
                ? "ops-allstar__nav-link ops-allstar__nav-link--active"
                : "ops-allstar__nav-link"
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {modules ? (
        <section className="ops-allstar__modules" aria-label="Module roadmap">
          {modules.map((mod) => (
            <article
              key={mod.key}
              className={`ops-allstar__module ops-allstar__module--${mod.status}`}
            >
              <div className="ops-allstar__module-head">
                <h2>{mod.label}</h2>
                <span className={`ops-allstar__badge ops-allstar__badge--${mod.status}`}>
                  {mod.status}
                </span>
              </div>
              <p>{mod.description}</p>
              {mod.href && mod.status === "active" ? (
                <Link href={mod.href}>Open module</Link>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {children}
    </div>
  );
}
