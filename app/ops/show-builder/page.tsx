import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ShowBuilderWorkspace } from "@/components/ops/show-builder/ShowBuilderWorkspace";

import "../ops.css";
import "../show-builder.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Set Builder — Retroverse Ops",
  robots: { index: false, follow: false },
};

export default function ShowBuilderPage() {
  if (process.env.RETROVERSE_OPS !== "1") {
    notFound();
  }

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner ops-page__inner--wide">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Sunday show · VirtualDJ lists</p>
            <h1 className="ops-topbar__title">Set Builder</h1>
          </div>
          <div className="ops-topbar__meta">
            <Link className="ops-link" href="/ops">
              Ops console
            </Link>
          </div>
        </header>

        <p className="ops-banner">
          Import year lists from MyLists → drag into sets → arrange show flow → export
          .vdjplaylist back to VirtualDJ.
        </p>
        <Suspense fallback={<p className="ops-empty">Loading show builder…</p>}>
          <ShowBuilderWorkspace />
        </Suspense>
      </div>
    </main>
  );
}
