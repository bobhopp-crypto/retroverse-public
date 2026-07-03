import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SundayNightsAdmin } from "@/components/ops/sunday-nights/SundayNightsAdmin";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../ops.css";
import "../show-builder.css";
import "./sunday-nights-admin.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sunday Nights — Retroverse Ops",
  robots: { index: false, follow: false },
};

export default function OpsSundayNightsPage() {
  if (!isOpsEnabled()) {
    notFound();
  }

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner ops-page__inner--wide">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Live event</p>
            <h1 className="ops-topbar__title">Sunday Nights</h1>
          </div>
          <div className="ops-topbar__meta">
            <Link className="ops-link" href="/ops">
              ← Ops
            </Link>
            {" · "}
            <Link className="ops-link" href="/ops/content-creator">
              Content Creator
            </Link>
          </div>
        </header>

        <SundayNightsAdmin />
      </div>
    </main>
  );
}
