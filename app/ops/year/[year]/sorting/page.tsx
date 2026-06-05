import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SortingBoard } from "@/components/ops/sorting-board/SortingBoard";
import { inspectPing } from "@/lib/inspect/pg";
import { reviewUniverseEnabledForYear } from "@/lib/ops/year-workspace/review-pilot";

import "../../../ops.css";
import "../../../sorting-board.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ year: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `Sorting Board ${year} — Retroverse Ops`,
    robots: { index: false, follow: false },
  };
}

export default async function SortingBoardPage({ params }: Props) {
  if (process.env.RETROVERSE_OPS !== "1") {
    notFound();
  }

  const { year: yearParam } = await params;
  const year = Number(yearParam);
  if (!Number.isFinite(year) || !reviewUniverseEnabledForYear(year)) {
    notFound();
  }

  const ping = await inspectPing();

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Temporary · tag discovery</p>
            <h1 className="ops-topbar__title">Sorting Board · {year}</h1>
          </div>
          <div className="ops-topbar__meta">
            <Link className="ops-link" href={`/ops/year/${year}`}>
              ← Review Universe
            </Link>
            <Link className="ops-link" href="/ops">
              Ops console
            </Link>
          </div>
        </header>

        {!ping.ok ? (
          <p className="ops-banner">
            <strong>Postgres offline</strong>
            {ping.error ? ` (${ping.error})` : ""}. Sorting board requires video data.
          </p>
        ) : (
          <>
            <p className="ops-banner">
              Drag songs into piles. Rename buckets to capture candidate Retroverse tags.
            </p>
            <SortingBoard year={year} />
          </>
        )}
      </div>
    </main>
  );
}
