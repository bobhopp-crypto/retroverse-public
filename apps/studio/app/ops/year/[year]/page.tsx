import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OpsYearWorkspace } from "@/components/ops/OpsYearWorkspace";
import { inspectPing } from "@/lib/inspect/pg";
import {
  isReviewPilotYear,
  REVIEW_PILOT_ACTIVE_YEARS,
} from "@/lib/ops/year-workspace/review-pilot";

import "../../ops.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ year: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `Review Universe ${year} — Retroverse Ops`,
    robots: { index: false, follow: false },
  };
}

function OpsBlocked(props: { message: string }) {
  return (
    <div className="ops-auth">
      <h1>Review Universe</h1>
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
  const pilotYear = isReviewPilotYear(year);

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · event prep</p>
            <h1 className="ops-topbar__title">Review Universe · {year}</h1>
          </div>
          <div className="ops-topbar__meta">
            <Link className="ops-link" href="/ops">
              ← Ops console
            </Link>
            {pilotYear ? (
              <Link className="ops-link" href={`/ops/year/${year}/sorting`}>
                Sorting board
              </Link>
            ) : null}
            {REVIEW_PILOT_ACTIVE_YEARS.filter((y) => y !== year).map((y) => (
              <Link key={y} className="ops-link" href={`/ops/year/${y}`}>
                {y} pilot
              </Link>
            ))}
          </div>
        </header>

        {!ping.ok ? (
          <p className="ops-banner">
            <strong>Postgres offline</strong>
            {ping.error ? ` (${ping.error})` : ""}. Year workspace requires chart + VDJ data.
          </p>
        ) : (
          <p className="ops-banner">
            {pilotYear ? (
              <>
                Classify each video: <strong>Fill</strong>, <strong>Cocktail</strong>,{" "}
                <strong>Dance</strong>, or <strong>Slow</strong>. Retroverse Tags are
                historical only — you own the classification.
              </>
            ) : (
              <>
                <strong>Review Universe</strong> — full-year mode for {year}.
              </>
            )}
          </p>
        )}

        {ping.ok ? <OpsYearWorkspace year={year} /> : null}
      </div>
    </main>
  );
}
