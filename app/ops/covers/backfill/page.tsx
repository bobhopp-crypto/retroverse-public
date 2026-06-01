import type { Metadata } from "next";

import { OpsCoverBackfillDashboard } from "@/components/ops/OpsCoverBackfillDashboard";

import "../../ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cover Backfill — Retroverse Ops",
  robots: { index: false, follow: false },
};

export default function OpsCoverBackfillPage() {
  if (process.env.RETROVERSE_OPS !== "1") {
    return (
      <main className="ops-page ops-page--train">
        <div className="ops-page__inner ops-page__inner--train">
          <p className="ops-cover-train__text">This page is not available.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="ops-page ops-page--train ops-page--backfill">
      <div className="ops-page__grain ops-page__grain--train" aria-hidden />
      <div className="ops-page__inner ops-page__inner--train">
        <OpsCoverBackfillDashboard />
      </div>
    </main>
  );
}
