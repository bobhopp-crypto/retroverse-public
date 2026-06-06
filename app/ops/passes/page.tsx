import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PassGenerator } from "@/components/ops/passes/PassGenerator";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../ops.css";
import "./passes.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pass Generator — Retroverse Ops",
  robots: { index: false, follow: false },
};

export default function OpsPassesPage() {
  if (!isOpsEnabled()) {
    notFound();
  }

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner ops-page__inner--wide">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Live event · print</p>
            <h1 className="ops-topbar__title">Pass Generator</h1>
          </div>
          <div className="ops-topbar__meta">
            <Link className="ops-link" href="/ops/sunday-nights">
              Sunday Nights
            </Link>
            {" · "}
            <Link className="ops-link" href="/ops">
              Ops console
            </Link>
          </div>
        </header>

        <p className="ops-banner">
          Generate vintage festival passes for hand-numbering at the door.{" "}
          <strong>8 passes per US Letter sheet</strong> — print, cut, write numbers.
        </p>

        <PassGenerator />
      </div>
    </main>
  );
}
