import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CrossroadsWorkspace } from "@/components/ops/crossroads/CrossroadsWorkspace";
import { inspectPing } from "@/lib/inspect/pg";

import "../ops.css";
import "../crossroads.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Crossroads — Retroverse Ops",
  robots: { index: false, follow: false },
};

export default async function CrossroadsPage() {
  if (process.env.RETROVERSE_OPS !== "1") {
    notFound();
  }

  const ping = await inspectPing();

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Bridge discovery · VDJ universe</p>
            <h1 className="ops-topbar__title">Crossroads</h1>
          </div>
          <div className="ops-topbar__meta">
            <Link className="ops-link" href="/ops">
              Ops console
            </Link>
          </div>
        </header>

        {!ping.ok ? (
          <p className="ops-banner">
            <strong>Postgres offline</strong>
            {ping.error ? ` (${ping.error})` : ""}. Crossroads needs video universe data.
          </p>
        ) : (
          <>
            <p className="ops-banner">
              Artists with songs in at least two selected years. Sorted by full span, then total
              song count.
            </p>
            <CrossroadsWorkspace />
          </>
        )}
      </div>
    </main>
  );
}
