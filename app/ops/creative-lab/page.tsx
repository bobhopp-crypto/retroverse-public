import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CreativeLabWorkspace } from "@/components/ops/creative-lab/CreativeLabWorkspace";

import "../ops.css";
import "./creative-lab.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Creative Lab — Retroverse Ops",
  robots: { index: false, follow: false },
};

export default function CreativeLabPage() {
  if (process.env.RETROVERSE_OPS !== "1") {
    notFound();
  }

  return (
    <main className="ops-page ops-page--creative-lab-workspace">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner ops-page__inner--wide">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · creative lab</p>
            <h1 className="ops-topbar__title">Creative Lab</h1>
          </div>
          <div className="ops-topbar__meta">
            <Link className="ops-link" href="/ops/media-lab">
              Media Lab
            </Link>
            {" · "}
            <Link className="ops-link" href="/ops">
              Ops console
            </Link>
          </div>
        </header>

        <p className="ops-banner">
          <strong>One style system, many outputs.</strong> Define event context and weighted visual
          styles — passes, posters, bumpers, cards, and magazines share the same foundation. No
          image generation yet.
        </p>

        <Suspense fallback={<p className="ops-dim">Loading Creative Lab…</p>}>
          <CreativeLabWorkspace />
        </Suspense>
      </div>
    </main>
  );
}
