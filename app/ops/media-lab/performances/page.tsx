import type { Metadata } from "next";
import Link from "next/link";

import { MediaLabPerformanceBrowser } from "@/components/ops/media-lab/MediaLabPerformanceBrowser";

import "../../ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Performance Browser — Media Lab",
  robots: { index: false, follow: false },
};

function OpsBlocked(props: { message: string }) {
  return (
    <div className="ops-auth">
      <h1>Performance Browser</h1>
      <p className="ops-dim">{props.message}</p>
    </div>
  );
}

export default function MediaLabPerformanceBrowserPage() {
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

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Internal · media lab</p>
            <h1 className="ops-topbar__title">Performance Browser</h1>
          </div>
          <div className="ops-topbar__meta">
            <Link className="ops-link" href="/ops/media-lab">
              ← Media Lab
            </Link>
            <Link className="ops-link" href="/ops">
              Ops
            </Link>
          </div>
        </header>

        <p className="ops-banner">
          <strong>Canonical performance manifest search.</strong> Find clips across collections and
          open clip review without going through a review queue.
        </p>

        <MediaLabPerformanceBrowser />
      </div>
    </main>
  );
}
