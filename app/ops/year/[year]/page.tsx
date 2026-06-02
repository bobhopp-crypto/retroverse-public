import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OpsYearWorkspace } from "@/components/ops/OpsYearWorkspace";
import { OPS_FOCUS_YEAR } from "@/lib/ops/load-ops-data";
import { inspectPing } from "@/lib/inspect/pg";

import "../../ops.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ year: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `Year Workspace ${year} — Retroverse Ops`,
    robots: { index: false, follow: false },
  };
}

function OpsBlocked(props: { message: string }) {
  return (
    <div className="ops-auth">
      <h1>Year Workspace</h1>
      <p className="ops-dim">{props.message}</p>
    </div>
  );
}

export default async function OpsYearWorkspacePage({ params }: Props) {
  if (process.env.RETROVERSE_OPS !== "1") {
    return (
      <main className="ops-page">
        <div className="ops-page__grain" aria-hidden />
        <div className="ops-page__inner">
          <OpsBlocked message="Ops disabled (set RETROVERSE_OPS=1)." />
        </div>
      </main>
    );
  }

  const { year: yearParam } = await params;
  const year = Number(yearParam);
  if (!Number.isFinite(year) || year < 1900 || year >= 2100) {
    notFound();
  }

  const ping = await inspectPing();

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · event prep</p>
            <h1 className="ops-topbar__title">Year {year}</h1>
          </div>
          <div className="ops-topbar__meta">
            <Link className="ops-link" href="/ops">
              ← Ops console
            </Link>
            <Link className="ops-link" href={`/ops/rvtags-review/${year}`}>
              RV tags review
            </Link>
            {year !== OPS_FOCUS_YEAR ? (
              <Link className="ops-link" href={`/ops/year/${OPS_FOCUS_YEAR}`}>
                Pilot {OPS_FOCUS_YEAR}
              </Link>
            ) : null}
          </div>
        </header>

        {!ping.ok ? (
          <p className="ops-banner">
            <strong>Postgres offline</strong>
            {ping.error ? ` (${ping.error})` : ""}. Year workspace requires chart + VDJ data.
          </p>
        ) : (
          <p className="ops-banner">
            <strong>Year Workspace</strong> — central production desk for {year}. Songs tab keeps
            Billboard reconciliation; other tabs track Wanted / Acquired / Approved assets with
            recommendations, workflow actions, and drop-zone metadata (stored under{" "}
            <code className="ops-mono">RETROVERSE_DATA/ops/year-workspace/{year}/</code>).
          </p>
        )}

        {ping.ok ? <OpsYearWorkspace year={year} /> : null}
      </div>
    </main>
  );
}
