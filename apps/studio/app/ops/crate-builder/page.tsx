import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CrateBuilderShell } from "@/components/ops/crate-builder/CrateBuilder";

import "../ops.css";
import "../crate-builder.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Crate Builder — Retroverse Ops",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ year?: string }> };

export default async function CrateBuilderPage({ searchParams }: Props) {
  if (process.env.RETROVERSE_OPS !== "1") {
    notFound();
  }

  const params = await searchParams;
  const yearParam = Number(params.year ?? "1967");
  const initialYear =
    Number.isFinite(yearParam) && [1967, 1978, 1992].includes(yearParam) ? yearParam : 1967;

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner ops-page__inner--wide">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">MyLists · visual grouping</p>
            <h1 className="ops-topbar__title">Crate Builder</h1>
          </div>
          <div className="ops-topbar__meta">
            <Link className="ops-link" href="/ops/show-builder">
              Set Builder
            </Link>
            {" · "}
            <Link className="ops-link" href="/ops">
              Ops console
            </Link>
          </div>
        </header>

        <p className="ops-banner">
          Experiment B — AI deals MyLists into 10 piles. Walk the table and fix mistakes. No
          rebalancing on drag.
        </p>

        <Suspense fallback={<p className="ops-empty">Loading crate builder…</p>}>
          <CrateBuilderShell initialYear={initialYear} />
        </Suspense>
      </div>
    </main>
  );
}
