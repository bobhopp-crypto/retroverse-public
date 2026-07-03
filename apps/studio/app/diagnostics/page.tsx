import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isInspectEnabled } from "@/lib/inspect/dev-gate";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "./diagnostics.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Diagnostics — Retroverse",
  robots: { index: false, follow: false },
};

const TOOLS = [
  {
    title: "Database Explorer",
    href: "/database-explorer",
    description: "Read-only Postgres graph explorer for local development.",
    enabled: isInspectEnabled(),
  },
  {
    title: "Command Center",
    href: "/ops",
    description: "Full operations console — shows, library, studio, and recovery.",
    enabled: isOpsEnabled(),
  },
];

export default function DiagnosticsPage() {
  if (!isOpsEnabled()) notFound();

  const available = TOOLS.filter((tool) => tool.enabled);

  return (
    <main className="ops-page ops-command diagnostics-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <header className="diagnostics-page__hero">
          <p className="ops-command__kicker">Retroverse Diagnostics</p>
          <h1 className="ops-command__title">Diagnostics</h1>
          <p className="ops-command__lead">
            Inspectors and system health — separate from public discovery and the Command Center
            hub.
          </p>
        </header>

        <section className="diagnostics-page__grid" aria-label="Diagnostic tools">
          {available.length > 0 ? (
            available.map((tool) => (
              <Link key={tool.href} href={tool.href} className="diagnostics-page__card">
                <h2>{tool.title}</h2>
                <p>{tool.description}</p>
              </Link>
            ))
          ) : (
            <p className="diagnostics-page__empty">
              No diagnostic tools are enabled in this environment.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
